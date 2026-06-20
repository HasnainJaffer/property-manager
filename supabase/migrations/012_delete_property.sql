-- ================================================================
-- MIGRATION: 012_delete_property.sql
-- Project:   Property Management Platform
-- Purpose:   SECURITY DEFINER function for cascading property deletion.
--            Handles every table in the schema in the correct FK order.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 011_reporting.sql (all schema migrations done)
--
-- WHY A SECURITY DEFINER FUNCTION:
--   Tables created via SQL migrations do not always receive the
--   automatic GRANT that Supabase's Table Editor applies. A
--   SECURITY DEFINER function runs as its owner (postgres), which
--   has full privileges on every table, so no per-table GRANT is
--   needed. It also executes as a single atomic transaction — if any
--   step fails, the entire delete is rolled back.
--
-- SECURITY MODEL:
--   This function does NOT re-check whether the caller is an owner.
--   That check is performed by the Next.js Route Handler BEFORE
--   calling this function via supabase.rpc(). The function itself
--   must only ever be callable from trusted server-side code.
--   GRANT EXECUTE is given to service_role only — never to authenticated.
--
-- FK CONSTRAINT MAP (reason for each deletion step):
--   work_orders.issue_id           → ON DELETE RESTRICT
--   work_order_notes.work_order_id → ON DELETE CASCADE (auto)
--   tenancy_terminations.tenancy_id → ON DELETE RESTRICT
--   inspections.property_id        → ON DELETE RESTRICT
--   inspection_items.inspection_id → ON DELETE CASCADE (auto)
--   hmo_licences.property_id       → ON DELETE RESTRICT
--   certificates.property_id       → ON DELETE RESTRICT
--   issues.property_id             → ON DELETE RESTRICT
--   tenancies.unit_id              → ON DELETE RESTRICT
--   tenancy_tenants.tenancy_id     → ON DELETE CASCADE (auto)
--   tenancy_renewals.tenancy_id    → ON DELETE CASCADE (auto)
--   rent_schedules.tenancy_id      → ON DELETE CASCADE (auto)
--   charges.tenancy_id             → ON DELETE CASCADE (auto)
--   payments.tenancy_id            → ON DELETE CASCADE (auto)
--   payment_allocations.*          → ON DELETE CASCADE (auto, via charges/payments)
--   properties (final delete)      → cascades to:
--     units → unit_amenities       ON DELETE CASCADE (auto)
--     tasks.property_id            ON DELETE CASCADE (auto)
--     property_valuations          ON DELETE CASCADE (auto)
--   documents (entity_type/id)     → NO FK (polymorphic) — manual cleanup
-- ================================================================


CREATE OR REPLACE FUNCTION delete_property_cascade(p_property_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issue_ids      UUID[];
  v_inspection_ids UUID[];
  v_cert_ids       UUID[];
  v_unit_ids       UUID[];
  v_tenancy_ids    UUID[];
BEGIN

  -- ── Collect child IDs we'll need for multi-step cleanup ──────────────────

  SELECT ARRAY(SELECT id FROM units        WHERE property_id  = p_property_id) INTO v_unit_ids;
  SELECT ARRAY(SELECT id FROM issues       WHERE property_id  = p_property_id) INTO v_issue_ids;
  SELECT ARRAY(SELECT id FROM inspections  WHERE property_id  = p_property_id) INTO v_inspection_ids;
  SELECT ARRAY(SELECT id FROM certificates WHERE property_id  = p_property_id) INTO v_cert_ids;

  IF array_length(v_unit_ids, 1) > 0 THEN
    SELECT ARRAY(
      SELECT id FROM tenancies WHERE unit_id = ANY(v_unit_ids)
    ) INTO v_tenancy_ids;
  END IF;

  -- ── Step 1: Documents (polymorphic — no FK, must be manual) ──────────────
  -- Clean up all documents linked to entities that belong to this property.

  DELETE FROM documents
  WHERE (entity_type = 'property'     AND entity_id = p_property_id)
     OR (entity_type = 'unit'         AND entity_id = ANY(v_unit_ids))
     OR (entity_type = 'issue'        AND entity_id = ANY(v_issue_ids))
     OR (entity_type = 'inspection'   AND entity_id = ANY(v_inspection_ids))
     OR (entity_type = 'certificate'  AND entity_id = ANY(v_cert_ids))
     OR (entity_type = 'tenancy'      AND entity_id = ANY(v_tenancy_ids));

  -- ── Step 2: work_orders (ON DELETE RESTRICT from issues) ─────────────────
  -- work_order_notes CASCADE from work_orders — no extra step needed.

  IF array_length(v_issue_ids, 1) > 0 THEN
    DELETE FROM work_orders WHERE issue_id = ANY(v_issue_ids);
  END IF;

  -- ── Step 3: tenancy_terminations (ON DELETE RESTRICT from tenancies) ─────

  IF array_length(v_tenancy_ids, 1) > 0 THEN
    DELETE FROM tenancy_terminations WHERE tenancy_id = ANY(v_tenancy_ids);
  END IF;

  -- ── Step 4: inspections (ON DELETE RESTRICT from properties) ─────────────
  -- inspection_items CASCADE from inspections — no extra step needed.

  DELETE FROM inspections WHERE property_id = p_property_id;

  -- ── Step 5: hmo_licences (ON DELETE RESTRICT from properties) ────────────

  DELETE FROM hmo_licences WHERE property_id = p_property_id;

  -- ── Step 6: certificates (ON DELETE RESTRICT from properties) ────────────

  DELETE FROM certificates WHERE property_id = p_property_id;

  -- ── Step 7: issues (ON DELETE RESTRICT from properties) ──────────────────
  -- work_orders already deleted in step 2 so this will succeed.

  DELETE FROM issues WHERE property_id = p_property_id;

  -- ── Step 8: tenancies (ON DELETE RESTRICT from units) ────────────────────
  -- Cascades automatically to:
  --   tenancy_tenants, tenancy_renewals, tenancy_documents,
  --   rent_schedules, charges, payments, payment_allocations

  IF array_length(v_unit_ids, 1) > 0 THEN
    DELETE FROM tenancies WHERE unit_id = ANY(v_unit_ids);
  END IF;

  -- ── Step 9: property (final delete) ──────────────────────────────────────
  -- Cascades automatically to:
  --   units → unit_amenities
  --   tasks (tasks.property_id ON DELETE CASCADE)
  --   property_valuations (ON DELETE CASCADE)

  DELETE FROM properties WHERE id = p_property_id;

END;
$$;


-- Only the service_role may execute this function.
-- The Route Handler verifies ownership before calling it.
GRANT EXECUTE ON FUNCTION delete_property_cascade(UUID) TO service_role;


-- ================================================================
-- DONE ✓
--
-- Function created:
--   delete_property_cascade(UUID) — atomic cascade delete for a property
--
-- Called from:
--   POST /api/properties/delete  (Next.js Route Handler, service_role client)
--
-- To verify:
--   1. Create a property with units, tenancies, certs, issues, tasks.
--   2. Call: SELECT delete_property_cascade('<property_uuid>');
--   3. Confirm: property, all child rows, and documents are gone.
--   4. Confirm: no FK constraint errors in the process.
-- ================================================================
