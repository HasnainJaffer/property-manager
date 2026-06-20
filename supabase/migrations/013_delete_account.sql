-- ================================================================
-- MIGRATION: 013_delete_account.sql
-- Project:   Property Management Platform
-- Purpose:   SECURITY DEFINER function for cascading account deletion.
--            Handles owned-org teardown in FK dependency order,
--            then returns orphaned member user_ids for the API
--            route to clean up via auth.admin.deleteUser().
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 012_delete_property.sql
--
-- FK CONSTRAINT ORDER (why each step comes before the next):
--   work_orders.issue_id            → ON DELETE RESTRICT  (delete before issues)
--   tenancy_terminations.tenancy_id → ON DELETE RESTRICT  (delete before tenancies)
--   tasks.org_id                    → ON DELETE RESTRICT  (delete before org)
--   inspections.property_id         → ON DELETE RESTRICT  (delete before properties)
--   hmo_licences.property_id        → ON DELETE RESTRICT  (delete before properties)
--   certificates.property_id        → ON DELETE RESTRICT  (delete before properties)
--   issues.property_id              → ON DELETE RESTRICT  (delete before properties)
--   tenancies.unit_id               → ON DELETE RESTRICT  (delete before properties/units)
--   tenancy_tenants.tenant_id       → ON DELETE RESTRICT  (delete via tenancy cascade first)
--   tenants.org_id                  → ON DELETE RESTRICT  (delete after tenancy cascade)
--   vendors.org_id                  → ON DELETE RESTRICT  (delete before org)
--   properties.org_id               → ON DELETE RESTRICT  (delete before org)
--
-- AUTO-CASCADE on org deletion (no manual step needed):
--   profiles, invitations, documents, notifications, audit_log,
--   occupancy_snapshots, financial_summaries, arrears_log
--
-- AUTO-CASCADE on tenancy deletion:
--   tenancy_tenants, tenancy_renewals, tenancy_documents,
--   rent_schedules, charges, payments, payment_allocations
--
-- AUTO-CASCADE on tenant deletion:
--   guarantors, tenant_references, tenant_documents
--
-- AUTO-CASCADE on property deletion:
--   units, unit_amenities, property_valuations, tasks (if any left)
--
-- AUTO-CASCADE on inspection deletion:
--   inspection_items
--
-- AUTO-CASCADE on work_order deletion:
--   work_order_notes
--
-- SECURITY MODEL:
--   Ownership check is performed by the Next.js Route Handler
--   BEFORE calling this function. This function trusts its input.
--   GRANT EXECUTE is given to service_role only.
-- ================================================================

CREATE OR REPLACE FUNCTION delete_account_cascade(p_user_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_ids        UUID[];
  v_org_id         UUID;
  v_all_member_ids UUID[];
  v_orphan_ids     UUID[];
  v_tenancy_ids    UUID[];
BEGIN

  -- ── Find all orgs where this user is owner ────────────────────────────────

  SELECT ARRAY(
    SELECT p.org_id
    FROM   profiles p
    JOIN   roles    r ON r.id = p.role_id
    WHERE  p.user_id = p_user_id AND r.name = 'owner'
  ) INTO v_org_ids;

  -- ── Collect member user_ids BEFORE any deletion ───────────────────────────
  -- We need this snapshot to determine who becomes orphaned later.

  IF array_length(v_org_ids, 1) > 0 THEN
    SELECT ARRAY(
      SELECT DISTINCT user_id
      FROM   profiles
      WHERE  org_id = ANY(v_org_ids) AND user_id != p_user_id
    ) INTO v_all_member_ids;
  END IF;

  -- ── Delete each owned org in FK-safe order ────────────────────────────────

  IF array_length(v_org_ids, 1) > 0 THEN
    FOREACH v_org_id IN ARRAY v_org_ids LOOP

      -- Snapshot tenancy IDs (needed for tenancy_terminations which have no org_id)
      SELECT ARRAY(SELECT id FROM tenancies WHERE org_id = v_org_id)
      INTO   v_tenancy_ids;

      -- Step 1: work_orders (RESTRICT from issues → must precede issues)
      --         Cascades: work_order_notes
      DELETE FROM work_orders WHERE org_id = v_org_id;

      -- Step 2: tenancy_terminations (RESTRICT from tenancies, no direct org_id)
      IF array_length(v_tenancy_ids, 1) > 0 THEN
        DELETE FROM tenancy_terminations WHERE tenancy_id = ANY(v_tenancy_ids);
      END IF;

      -- Step 3: tasks (RESTRICT from org → must precede org deletion)
      --         Cascades: task_assignments
      DELETE FROM tasks WHERE org_id = v_org_id;

      -- Step 4: inspections (RESTRICT from properties → must precede properties)
      --         Cascades: inspection_items
      DELETE FROM inspections WHERE org_id = v_org_id;

      -- Step 5: hmo_licences (RESTRICT from properties → must precede properties)
      DELETE FROM hmo_licences WHERE org_id = v_org_id;

      -- Step 6: certificates (RESTRICT from properties → must precede properties)
      DELETE FROM certificates WHERE org_id = v_org_id;

      -- Step 7: issues (RESTRICT from properties → must precede properties)
      --         work_orders already gone in step 1
      DELETE FROM issues WHERE org_id = v_org_id;

      -- Step 8: tenancies (RESTRICT from units → must precede properties)
      --         Cascades: tenancy_tenants, tenancy_renewals, tenancy_documents,
      --                   rent_schedules, charges, payments, payment_allocations
      DELETE FROM tenancies WHERE org_id = v_org_id;

      -- Step 9: tenants (RESTRICT from tenancy_tenants, now gone via step 8)
      --         Cascades: guarantors, tenant_references, tenant_documents
      DELETE FROM tenants WHERE org_id = v_org_id;

      -- Step 10: vendors (RESTRICT from org → must precede org deletion)
      DELETE FROM vendors WHERE org_id = v_org_id;

      -- Step 11: properties (RESTRICT from org → must precede org deletion)
      --          Cascades: units, unit_amenities, property_valuations,
      --                    any remaining tasks (already gone in step 3)
      DELETE FROM properties WHERE org_id = v_org_id;

      -- Step 12: organisation (final delete for this org)
      --          Cascades: profiles, invitations, documents, notifications,
      --                    audit_log, occupancy_snapshots, financial_summaries,
      --                    arrears_log
      DELETE FROM organisations WHERE id = v_org_id;

    END LOOP;
  END IF;

  -- ── Determine which former members are now fully orphaned ─────────────────
  -- An orphaned member has no remaining profiles in any org.
  -- The API route will delete their auth accounts.

  IF array_length(v_all_member_ids, 1) > 0 THEN
    SELECT ARRAY(
      SELECT uid
      FROM   unnest(v_all_member_ids) AS uid
      WHERE  NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = uid)
    ) INTO v_orphan_ids;
  END IF;

  RETURN COALESCE(v_orphan_ids, ARRAY[]::UUID[]);

END;
$$;


-- Only the service_role may execute this function.
-- The Route Handler verifies the caller's identity before invoking it.
GRANT EXECUTE ON FUNCTION delete_account_cascade(UUID) TO service_role;


-- ================================================================
-- DONE ✓
--
-- Function created:
--   delete_account_cascade(UUID) — atomic cascade delete for an account
--
-- Called from:
--   POST /api/account/delete  (Next.js Route Handler, service_role client)
--
-- Returns:
--   UUID[] of member user_ids whose auth accounts the Route Handler
--   must also delete (members that were only in the deleted org(s)).
--
-- To verify:
--   1. Create an org with properties, tenancies, compliance certs, issues.
--   2. Invite a team member who only belongs to this org.
--   3. Run: SELECT delete_account_cascade('<owner_user_uuid>');
--   4. Confirm: all org data is gone, orphaned member returned in array.
-- ================================================================
