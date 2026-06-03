-- ================================================================
-- MIGRATION: 004_tenancies.sql
-- Project:   Property Management Platform
-- Purpose:   Tenancy layer — the legal agreements that link units to
--            tenants, plus renewals, terminations, and documents.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 003_tenants.sql
--
-- WHAT THIS FILE BUILDS:
--   1. tenancies             — core legal agreement: unit + terms + deposit
--   2. tenancy_tenants       — junction table for joint tenancies
--   3. tenancy_renewals      — renewal history (new term, new rent)
--   4. tenancy_terminations  — notice and termination records
--   5. tenancy_documents     — ASTs, S21 notices, inventories, etc.
--   6. Trigger               — sync tenancies.org_id from units.org_id
--   7. Indexes               — fast lookups by org, unit, status, dates
--   8. RLS policies          — org-scoped data isolation
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--   002_properties.sql  (units — tenancies reference units.id)
--   003_tenants.sql     (tenants — tenancy_tenants references tenants.id)
--
-- KEY DESIGN DECISIONS:
--   - tenancies.org_id is denormalised from units.org_id (same pattern
--     as units.org_id in 002 and guarantors.org_id in 003) via trigger,
--     so RLS on tenancies never requires a join to units.
--   - Joint tenancies: a tenancy can have multiple tenants via the
--     tenancy_tenants junction table. is_lead flags the primary tenant
--     for correspondence and legal notices.
--   - tenancy_terminations uses ON DELETE RESTRICT (not CASCADE) because
--     a termination record is a legal audit trail. A tenancy with a
--     termination record should not be deletable — mark is_active = false
--     instead.
--   - tenancy_renewals and tenancy_documents use ON DELETE CASCADE because
--     they have no standalone meaning outside their parent tenancy.
--   - deposit fields are on tenancies (not a separate table) because
--     deposit protection is part of the tenancy agreement itself. The
--     30-day registration requirement (Housing Act 2004) is enforced
--     via compliance alerts using deposit_amount + deposit_registered_date.
--   - Section 21 (no-fault eviction) is included as a termination_type
--     and document_type. Note: the Renters' Rights Bill (England, expected
--     Royal Assent 2025) will abolish S21. The schema stores the type as
--     data — removing it from the CHECK list in a future migration is a
--     one-line change.
-- ================================================================


-- ================================================================
-- SECTION 1: TENANCIES
--
-- A tenancy is the legal agreement between a landlord (via the org)
-- and one or more tenants to occupy a specific unit for a defined
-- rent and period.
--
-- TENANCY TYPES:
--   ast                  — Assured Shorthold Tenancy. The standard UK
--                          residential agreement. Fixed term, then
--                          rolls to statutory_periodic.
--   statutory_periodic   — Rolls on automatically after a fixed AST
--                          ends with no new agreement signed.
--   contractual_periodic — Explicitly agreed rolling periodic from
--                          the outset (no fixed end date).
--   licence              — Lodger/licence agreement. Not a full AST.
--                          Used for lodgers in the landlord's home.
--   other                — Commercial/non-standard agreements.
--
-- STATUS LIFECYCLE:
--   active → periodic → in_notice → ended
--   active → cancelled  (if cancelled before move-in)
--
-- DEPOSIT:
--   UK Housing Act 2004: deposits must be registered in a government
--   scheme (DPS, TDS, or myDeposits) within 30 days of receipt.
--   Failure = tenant entitled to 1–3x deposit as a financial penalty
--   and landlord cannot serve a valid Section 21 notice.
--   deposit_registered_date is indexed for compliance alerts.
--
-- RENT DUE DAY:
--   The day of month rent is due. Capped at 28 to avoid ambiguity
--   in February and 30-day months. Day 1 = 1st of each month.
-- ================================================================

CREATE TABLE tenancies (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID          NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  unit_id         UUID          NOT NULL REFERENCES units(id) ON DELETE RESTRICT,

  -- Agreement type and status
  tenancy_type    TEXT          NOT NULL DEFAULT 'ast'
                                CHECK (tenancy_type IN (
                                  'ast', 'statutory_periodic',
                                  'contractual_periodic', 'licence', 'other'
                                )),
  status          TEXT          NOT NULL DEFAULT 'active'
                                CHECK (status IN (
                                  'active', 'periodic', 'in_notice', 'ended', 'cancelled'
                                )),

  -- Term dates
  start_date      DATE          NOT NULL,
  end_date        DATE,                     -- NULL = rolling/periodic from the outset
  break_clause_date  DATE,                  -- date either party can end early, if applicable
  notice_period_days INT        NOT NULL DEFAULT 60,  -- contractual notice period in days

  -- Rent
  rent_amount     NUMERIC(10,2) NOT NULL,
  rent_frequency  TEXT          NOT NULL DEFAULT 'monthly'
                                CHECK (rent_frequency IN (
                                  'weekly', 'fortnightly', 'monthly', 'quarterly'
                                )),
  rent_due_day    INT           NOT NULL DEFAULT 1
                                CHECK (rent_due_day BETWEEN 1 AND 28),

  -- Deposit (Housing Act 2004 — must register within 30 days)
  deposit_amount          NUMERIC(10,2),
  deposit_weeks           INT           DEFAULT 5
                                        CHECK (deposit_weeks BETWEEN 1 AND 5),
  deposit_scheme          TEXT          CHECK (deposit_scheme IN ('dps', 'tds', 'mydeposits', 'none')),
  deposit_scheme_ref      TEXT,
  deposit_registered_date DATE,

  -- Furnishing
  is_furnished    BOOLEAN       NOT NULL DEFAULT false,

  -- Metadata
  notes           TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenancies_updated_at
  BEFORE UPDATE ON tenancies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 2: TENANCY TENANTS (JUNCTION TABLE)
--
-- Links one or more tenants to a tenancy. Supports joint tenancies
-- where multiple people are co-signatories on the same agreement.
--
-- is_lead: flags the primary tenant for correspondence, legal
-- notices, and display in lists. There should be exactly one lead
-- tenant per tenancy — this is a soft rule enforced in application
-- code rather than a DB constraint to avoid race conditions on
-- multi-row inserts.
--
-- added_at: records when a tenant was added to the tenancy.
-- For the original signatories this equals the tenancy start date.
-- For mid-tenancy additions (e.g. a new flatmate joins) this will
-- be a later date.
-- ================================================================

CREATE TABLE tenancy_tenants (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id  UUID        NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,

  is_lead     BOOLEAN     NOT NULL DEFAULT false,
  added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenancy_id, tenant_id)
);


-- ================================================================
-- SECTION 3: TENANCY RENEWALS
--
-- Records each time a tenancy is formally renewed — i.e. a new
-- fixed term is agreed and signed, replacing the previous one.
--
-- This table is an append-only audit trail of renewal events.
-- Each row captures the before/after rent and end date so the
-- full history of rent increases can be reported.
--
-- renewal_type:
--   fixed_term — a new fixed-term agreement is signed
--   periodic   — the tenancy is explicitly confirmed as periodic
--                (month-to-month) without a new fixed end date
--
-- effective_date: the date the new terms take effect, which may
-- differ from signed_date (e.g. signed in December, effective
-- from February).
-- ================================================================

CREATE TABLE tenancy_renewals (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id        UUID          NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,

  previous_end_date DATE,
  new_end_date      DATE          NOT NULL,
  previous_rent     NUMERIC(10,2),
  new_rent          NUMERIC(10,2) NOT NULL,

  renewal_type      TEXT          NOT NULL DEFAULT 'fixed_term'
                                  CHECK (renewal_type IN ('fixed_term', 'periodic')),

  signed_date       DATE,
  effective_date    DATE,

  notes             TEXT,
  created_by        UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
  -- No updated_at: renewals are immutable records of events.
  -- Create a new row to correct a mistake rather than editing.
);


-- ================================================================
-- SECTION 4: TENANCY TERMINATIONS
--
-- Records formal notice and termination events. A tenancy should
-- never be hard-deleted once a termination record exists — the
-- record is a legal audit trail. The FK uses ON DELETE RESTRICT
-- to enforce this.
--
-- TERMINATION TYPES:
--   section_21        — no-fault possession notice (England/Wales).
--                       Requires a valid deposit, EPC, gas cert, and
--                       How to Rent guide to have been served.
--                       NOTE: being abolished by the Renters' Rights
--                       Bill (expected Royal Assent 2025).
--   section_8         — fault-based possession notice. Requires one
--                       or more Schedule 2 grounds (e.g. rent arrears,
--                       anti-social behaviour).
--   mutual_surrender  — landlord and tenant agree to end early.
--   abandonment       — tenant has left without notice. Proceed with
--                       caution — legal advice recommended before
--                       re-letting.
--   end_of_term       — tenancy ends naturally at its agreed end date.
--   other             — any other termination (death, TUPE, etc.)
--
-- notice_date:       when notice was formally served
-- vacate_date:       the date the tenant is required to vacate by
-- actual_vacate_date: when the tenant actually left (may differ)
-- ================================================================

CREATE TABLE tenancy_terminations (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id        UUID        NOT NULL REFERENCES tenancies(id) ON DELETE RESTRICT,

  termination_type  TEXT        NOT NULL
                                CHECK (termination_type IN (
                                  'section_21', 'section_8', 'mutual_surrender',
                                  'abandonment', 'end_of_term', 'other'
                                )),

  notice_date         DATE,
  vacate_date         DATE,
  actual_vacate_date  DATE,

  reason          TEXT,
  initiated_by    TEXT          NOT NULL
                                CHECK (initiated_by IN ('landlord', 'tenant', 'mutual')),

  notes           TEXT,
  created_by      UUID          REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenancy_terminations_updated_at
  BEFORE UPDATE ON tenancy_terminations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 5: TENANCY DOCUMENTS
--
-- Stores legal and operational documents tied to a tenancy.
-- Each row points to a file in Supabase Storage.
--
-- DOCUMENT TYPES:
--   ast                — the signed Assured Shorthold Tenancy agreement
--   renewal_agreement  — signed renewal/new fixed-term agreement
--   section_21         — served Section 21 notice
--   section_8          — served Section 8 notice
--   how_to_rent        — mandatory How to Rent guide (must be served
--                        at tenancy start — failure invalidates S21)
--   deposit_certificate — deposit protection certificate from scheme
--   check_in_report    — condition report at start of tenancy
--   check_out_report   — condition report at end of tenancy
--   inventory          — full inventory of contents and condition
--   other              — any other tenancy-related document
--
-- file_name and file_path are both required — legal documents must
-- always have an associated file (unlike tenant_documents where
-- a record can exist before the file is uploaded).
-- ================================================================

CREATE TABLE tenancy_documents (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenancy_id      UUID        NOT NULL REFERENCES tenancies(id) ON DELETE CASCADE,

  document_type   TEXT        NOT NULL
                              CHECK (document_type IN (
                                'ast', 'renewal_agreement', 'section_21', 'section_8',
                                'how_to_rent', 'deposit_certificate',
                                'check_in_report', 'check_out_report',
                                'inventory', 'other'
                              )),

  file_name       TEXT        NOT NULL,
  file_path       TEXT        NOT NULL,   -- Supabase Storage path
  file_size_bytes BIGINT,

  issued_date     DATE,
  notes           TEXT,
  uploaded_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: documents are immutable. Replace rather than edit.
);


-- ================================================================
-- SECTION 6: TRIGGER — SYNC tenancies.org_id
--
-- tenancies.org_id must always equal the org_id of the linked unit.
-- Derived automatically on INSERT and UPDATE of unit_id so callers
-- do not set it manually (and cannot set it incorrectly).
-- Consistent with sync_unit_org_id() in 002 and sync_guarantor_org_id() in 003.
-- ================================================================

CREATE OR REPLACE FUNCTION sync_tenancy_org_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT org_id INTO NEW.org_id
  FROM units
  WHERE id = NEW.unit_id;

  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'Unit % not found or has no org_id', NEW.unit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_tenancies_set_org_id
  BEFORE INSERT OR UPDATE OF unit_id ON tenancies
  FOR EACH ROW EXECUTE FUNCTION sync_tenancy_org_id();


-- ================================================================
-- SECTION 7: INDEXES
-- ================================================================

-- tenancies
CREATE INDEX idx_tenancies_org_id       ON tenancies(org_id);
CREATE INDEX idx_tenancies_unit_id      ON tenancies(unit_id);
CREATE INDEX idx_tenancies_status       ON tenancies(status);
CREATE INDEX idx_tenancies_start_date   ON tenancies(start_date);
CREATE INDEX idx_tenancies_end_date     ON tenancies(end_date);

-- tenancy_tenants
CREATE INDEX idx_tenancy_tenants_tenancy_id  ON tenancy_tenants(tenancy_id);
CREATE INDEX idx_tenancy_tenants_tenant_id   ON tenancy_tenants(tenant_id);

-- tenancy_renewals
CREATE INDEX idx_tenancy_renewals_tenancy_id  ON tenancy_renewals(tenancy_id);

-- tenancy_terminations
CREATE INDEX idx_tenancy_terminations_tenancy_id  ON tenancy_terminations(tenancy_id);

-- tenancy_documents
CREATE INDEX idx_tenancy_documents_tenancy_id  ON tenancy_documents(tenancy_id);
CREATE INDEX idx_tenancy_documents_type        ON tenancy_documents(document_type);


-- ================================================================
-- SECTION 8: ROW LEVEL SECURITY
--
-- Pattern mirrors 001, 002, and 003 — inline subqueries on profiles.
--
-- tenancies (has org_id):
--   - All org members can SELECT (viewer, staff, maintenance, etc.)
--   - Owners and managers can INSERT and UPDATE
--   - Only owners can DELETE (cascades nothing critical, but is
--     RESTRICT-blocked if a termination record exists)
--
-- tenancy_tenants, tenancy_renewals, tenancy_terminations,
-- tenancy_documents (no org_id — resolved through parent tenancy):
--   - SELECT: join through tenancies to check org membership
--   - INSERT/UPDATE: join through tenancies → profiles → roles
--   - DELETE: owners and managers only
-- ================================================================

-- ---- TENANCIES ----
ALTER TABLE tenancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenancies"
  ON tenancies FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can insert tenancies"
  ON tenancies FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can update tenancies"
  ON tenancies FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Owners can delete tenancies"
  ON tenancies FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name = 'owner'
    )
  );


-- ---- TENANCY TENANTS ----
-- No org_id — access resolved through parent tenancy.
ALTER TABLE tenancy_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenancy tenants"
  ON tenancy_tenants FOR SELECT
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT id FROM tenancies
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can insert tenancy tenants"
  ON tenancy_tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can delete tenancy tenants"
  ON tenancy_tenants FOR DELETE
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ---- TENANCY RENEWALS ----
-- No org_id — access resolved through parent tenancy.
ALTER TABLE tenancy_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenancy renewals"
  ON tenancy_renewals FOR SELECT
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT id FROM tenancies
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can insert tenancy renewals"
  ON tenancy_renewals FOR INSERT
  TO authenticated
  WITH CHECK (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can delete tenancy renewals"
  ON tenancy_renewals FOR DELETE
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ---- TENANCY TERMINATIONS ----
-- No org_id — access resolved through parent tenancy.
ALTER TABLE tenancy_terminations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenancy terminations"
  ON tenancy_terminations FOR SELECT
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT id FROM tenancies
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can insert tenancy terminations"
  ON tenancy_terminations FOR INSERT
  TO authenticated
  WITH CHECK (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can update tenancy terminations"
  ON tenancy_terminations FOR UPDATE
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can delete tenancy terminations"
  ON tenancy_terminations FOR DELETE
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ---- TENANCY DOCUMENTS ----
-- No org_id — access resolved through parent tenancy.
ALTER TABLE tenancy_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenancy documents"
  ON tenancy_documents FOR SELECT
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT id FROM tenancies
      WHERE org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can upload tenancy documents"
  ON tenancy_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can delete tenancy documents"
  ON tenancy_documents FOR DELETE
  TO authenticated
  USING (
    tenancy_id IN (
      SELECT t.id FROM tenancies t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ================================================================
-- DONE ✓
--
-- Tables created:
--   tenancies            — legal agreements: unit + terms + deposit
--   tenancy_tenants      — junction: multiple tenants per tenancy
--   tenancy_renewals     — append-only renewal history
--   tenancy_terminations — notice and eviction records (RESTRICT delete)
--   tenancy_documents    — ASTs, S21/S8 notices, inventories, etc.
--
-- Function created:
--   sync_tenancy_org_id() — keeps tenancies.org_id in sync with
--                           the parent unit's org_id automatically
--
-- NEXT MIGRATION: 005_rent.sql
--   → rent_schedules, charges, payments, payment_allocations,
--     security_deposits, arrears_log
--
-- HOW TO VERIFY:
--   Supabase → Table Editor: check all 5 tables exist.
--   Insert a tenancy with a mismatched org_id — trigger should
--   override it with the correct value from units.
--   Insert a tenancy_termination then try to DELETE the tenancy
--   — should be blocked by the RESTRICT foreign key.
-- ================================================================
