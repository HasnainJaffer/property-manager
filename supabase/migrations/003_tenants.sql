-- ================================================================
-- MIGRATION: 003_tenants.sql
-- Project:   Property Management Platform
-- Purpose:   Tenant layer — tenant records, guarantors, referencing,
--            and identity/vetting documents.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 002_properties.sql
--
-- WHAT THIS FILE BUILDS:
--   1. tenants            — person records for all tenants in an org
--   2. guarantors         — guarantors linked to individual tenants
--   3. tenant_references  — employment, landlord, credit check records
--   4. tenant_documents   — identity docs and vetting documents
--   5. Triggers           — updated_at; guarantors.org_id sync
--   6. Indexes            — fast lookups by org, tenant, status
--   7. RLS policies       — org-scoped data isolation
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--   002_properties.sql  (no direct dependency, but must be in sequence)
--
-- KEY DESIGN DECISIONS:
--   - tenants are org-scoped CRM records, independent of any specific unit
--     or property. The link to a unit is made in 004_tenancies.sql via the
--     tenancy_tenants junction table. This allows a tenant to have multiple
--     tenancies over time within the same org.
--   - guarantors.org_id is denormalised from tenants.org_id (same pattern
--     as units.org_id) via a trigger, for efficient RLS without joins.
--   - tenant_references and tenant_documents have no org_id — they are
--     accessed only through a known tenant, so RLS joins through tenants.
--   - right_to_rent fields are first-class columns (not stored in documents)
--     because Right to Rent checks are a legal obligation (Immigration Act
--     2014) and must be surfaced as compliance alerts on the dashboard.
--   - tenant_documents covers identity and vetting docs only (passport,
--     right to rent evidence, credit reports). Tenancy agreements and
--     inspection reports belong in 009_documents.sql (polymorphic).
-- ================================================================


-- ================================================================
-- SECTION 1: TENANTS
--
-- A tenant is a person (not a system user) who rents or has rented
-- from this organisation. Think of this as the landlord's contact
-- book / CRM — a tenant record exists independently of any tenancy.
--
-- The same tenant can appear in multiple tenancies over time:
-- e.g. moved from one property to another within the same portfolio.
-- That link is created in 004_tenancies.sql via tenancy_tenants.
--
-- RIGHT TO RENT (Immigration Act 2014):
--   All UK landlords must check that tenants have the right to rent
--   before a tenancy starts. For UK/settled-status tenants this is
--   a one-off check. For time-limited leave (visas), landlords must
--   re-check before the leave expires. Failure = up to £20,000 fine.
--   right_to_rent_expiry = NULL means no expiry (unlimited leave).
-- ================================================================

CREATE TABLE tenants (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id        UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,

  -- Personal details
  title         TEXT        CHECK (title IN ('mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'mx', 'other')),
  first_name    TEXT        NOT NULL,
  last_name     TEXT        NOT NULL,
  date_of_birth DATE,
  email         TEXT,
  phone         TEXT,

  -- Identity (used for Right to Rent and referencing)
  national_insurance_number  TEXT,  -- NI number, e.g. "QQ 12 34 56 C"
  nationality                TEXT,
  id_type       TEXT        CHECK (id_type IN ('passport', 'driving_licence', 'brp', 'euss', 'other')),
  id_number     TEXT,
  id_expiry     DATE,

  -- Right to Rent (legal requirement — Immigration Act 2014)
  -- not_checked   : check not yet done (alert required before tenancy start)
  -- unlimited     : UK/Irish national or settled status — no repeat check needed
  -- time_limited  : valid leave to remain — must re-check before right_to_rent_expiry
  -- failed        : no right to rent — cannot proceed with tenancy
  right_to_rent_status  TEXT  NOT NULL DEFAULT 'not_checked'
                              CHECK (right_to_rent_status IN (
                                'not_checked', 'unlimited', 'time_limited', 'failed'
                              )),
  right_to_rent_check_date  DATE,
  right_to_rent_expiry      DATE,  -- NULL = unlimited leave, no re-check needed

  -- Pre-tenancy address (where the tenant lives before moving in)
  current_address_line1  TEXT,
  current_address_line2  TEXT,
  current_city           TEXT,
  current_postcode       TEXT,

  -- Emergency contact
  emergency_contact_name          TEXT,
  emergency_contact_phone         TEXT,
  emergency_contact_relationship  TEXT,

  -- Metadata
  notes       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 2: GUARANTORS
--
-- A guarantor agrees to cover rent and obligations if the tenant
-- defaults. Common for students, young professionals, and tenants
-- with low income relative to the rent.
--
-- One tenant can have one or more guarantors. Most tenancies only
-- need one. The relationship and income fields are used to assess
-- whether the guarantor is financially adequate (standard check:
-- guarantor earns 36x monthly rent annually).
--
-- org_id is denormalised from tenants.org_id via trigger below
-- (Section 5) so that RLS policies do not require a join.
-- ================================================================

CREATE TABLE guarantors (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id      UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Personal details
  title       TEXT        CHECK (title IN ('mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'mx', 'other')),
  first_name  TEXT        NOT NULL,
  last_name   TEXT        NOT NULL,
  email       TEXT,
  phone       TEXT,
  date_of_birth  DATE,

  -- Address
  address_line1  TEXT,
  address_line2  TEXT,
  city           TEXT,
  postcode       TEXT,
  country        TEXT NOT NULL DEFAULT 'GB',

  -- Financial vetting
  relationship   TEXT  CHECK (relationship IN ('parent', 'relative', 'employer', 'friend', 'other')),
  employer_name  TEXT,
  annual_income  NUMERIC(10,2),

  -- Metadata
  notes       TEXT,
  is_active   BOOLEAN     NOT NULL DEFAULT true,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_guarantors_updated_at
  BEFORE UPDATE ON guarantors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 3: TENANT REFERENCES
--
-- Tracks the referencing process for each tenant. Landlords and
-- letting agents typically require:
--   1. Employment reference  — confirms salary and employment status
--   2. Previous landlord ref — confirms rental history and behaviour
--   3. Credit check          — checks CCJs, defaults, bankruptcy
--   4. Character reference   — personal/professional character witness
--
-- status lifecycle: pending → requested → received → passed / failed
-- 'waived' covers cases where a landlord accepts a larger deposit
-- in lieu of a reference (allowed under pre-Tenant Fees Act rules).
--
-- No org_id column here — access is always via a known tenant_id,
-- so RLS joins through the tenants table.
-- ================================================================

CREATE TABLE tenant_references (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  reference_type  TEXT  NOT NULL
                        CHECK (reference_type IN (
                          'employment', 'previous_landlord', 'personal',
                          'credit_check', 'character', 'other'
                        )),

  -- Who provided the reference
  provider_name   TEXT,
  provider_email  TEXT,
  provider_phone  TEXT,

  -- Lifecycle
  status          TEXT  NOT NULL DEFAULT 'pending'
                        CHECK (status IN (
                          'pending', 'requested', 'received', 'passed', 'failed', 'waived'
                        )),
  requested_at    DATE,
  received_at     DATE,

  -- Outcome
  outcome_notes   TEXT,

  -- Metadata
  notes       TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tenant_references_updated_at
  BEFORE UPDATE ON tenant_references
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 4: TENANT DOCUMENTS
--
-- Stores identity, vetting, and right-to-rent documents for a
-- tenant. Each row points to a file in Supabase Storage.
--
-- SCOPE — what belongs here:
--   passport copies, BRP cards, driving licences (Right to Rent)
--   credit reports, employment letters, bank statements (vetting)
--   visa/leave documents (Right to Rent time-limited checks)
--
-- NOT in scope here (belongs in 009_documents.sql):
--   tenancy agreements, inspection reports, safety certificates
--
-- expiry_date: used for visa/BRP copies so compliance alerts can
-- fire before the tenant's right to rent lapses (see above).
--
-- No org_id column — access is always via a known tenant_id,
-- so RLS joins through the tenants table.
-- ================================================================

CREATE TABLE tenant_documents (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  document_type  TEXT  NOT NULL
                       CHECK (document_type IN (
                         'passport', 'driving_licence', 'brp',
                         'visa', 'right_to_rent_share_code',
                         'employment_letter', 'bank_statement',
                         'proof_of_income', 'credit_report',
                         'landlord_reference', 'other'
                       )),

  -- Display name shown in the UI
  name           TEXT  NOT NULL,

  -- Supabase Storage path (e.g. "tenants/{org_id}/{tenant_id}/{filename}")
  file_path      TEXT,
  file_size_bytes BIGINT,
  mime_type      TEXT,

  -- Expiry tracking (e.g. for visa copies, BRP cards)
  expiry_date    DATE,

  -- Metadata
  notes          TEXT,
  uploaded_by    UUID  REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: documents are immutable. Replace rather than update.
);


-- ================================================================
-- SECTION 5: TRIGGER — SYNC guarantors.org_id
--
-- guarantors.org_id must always match the org_id of the linked
-- tenant. Derived automatically on INSERT and UPDATE so callers
-- never need to set it explicitly.
-- ================================================================

CREATE OR REPLACE FUNCTION sync_guarantor_org_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT org_id INTO NEW.org_id
  FROM tenants
  WHERE id = NEW.tenant_id;

  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'Tenant % not found or has no org_id', NEW.tenant_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_guarantors_set_org_id
  BEFORE INSERT OR UPDATE OF tenant_id ON guarantors
  FOR EACH ROW EXECUTE FUNCTION sync_guarantor_org_id();


-- ================================================================
-- SECTION 6: INDEXES
-- ================================================================

-- tenants
CREATE INDEX idx_tenants_org_id          ON tenants(org_id);
CREATE INDEX idx_tenants_email           ON tenants(email);
CREATE INDEX idx_tenants_last_name       ON tenants(last_name);
CREATE INDEX idx_tenants_rtr_status      ON tenants(right_to_rent_status);
CREATE INDEX idx_tenants_rtr_expiry      ON tenants(right_to_rent_expiry);
CREATE INDEX idx_tenants_active          ON tenants(is_active);

-- guarantors
CREATE INDEX idx_guarantors_org_id       ON guarantors(org_id);
CREATE INDEX idx_guarantors_tenant_id    ON guarantors(tenant_id);
CREATE INDEX idx_guarantors_active       ON guarantors(is_active);

-- tenant_references
CREATE INDEX idx_tenant_refs_tenant_id   ON tenant_references(tenant_id);
CREATE INDEX idx_tenant_refs_type        ON tenant_references(reference_type);
CREATE INDEX idx_tenant_refs_status      ON tenant_references(status);

-- tenant_documents
CREATE INDEX idx_tenant_docs_tenant_id   ON tenant_documents(tenant_id);
CREATE INDEX idx_tenant_docs_type        ON tenant_documents(document_type);
CREATE INDEX idx_tenant_docs_expiry      ON tenant_documents(expiry_date);


-- ================================================================
-- SECTION 7: ROW LEVEL SECURITY
--
-- Pattern mirrors 001 and 002 — inline subqueries on profiles table.
--
-- tenants and guarantors: org-scoped
--   - All org members can SELECT (viewer, staff, cleaner, etc.)
--   - Owners, managers, and accountants can INSERT and UPDATE
--     (accountant needs tenant data for financial reporting)
--   - Only owners and managers can DELETE
--
-- tenant_references and tenant_documents: access via parent tenant
--   - SELECT/INSERT/DELETE resolved by joining through tenants
--   - Same write-permission rules as tenants
-- ================================================================

-- ---- TENANTS ----
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenants"
  ON tenants FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins and accountants can insert tenants"
  ON tenants FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins and accountants can update tenants"
  ON tenants FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins can delete tenants"
  ON tenants FOR DELETE
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


-- ---- GUARANTORS ----
ALTER TABLE guarantors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view guarantors"
  ON guarantors FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins and accountants can insert guarantors"
  ON guarantors FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins and accountants can update guarantors"
  ON guarantors FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins can delete guarantors"
  ON guarantors FOR DELETE
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


-- ---- TENANT REFERENCES ----
-- No org_id — access resolved through parent tenant.
ALTER TABLE tenant_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenant references"
  ON tenant_references FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      WHERE t.org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins and accountants can insert tenant references"
  ON tenant_references FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins and accountants can update tenant references"
  ON tenant_references FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins can delete tenant references"
  ON tenant_references FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ---- TENANT DOCUMENTS ----
-- No org_id — access resolved through parent tenant.
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tenant documents"
  ON tenant_documents FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
      WHERE t.org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins and accountants can upload tenant documents"
  ON tenant_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT t.id FROM tenants t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'accountant')
    )
  );

CREATE POLICY "Admins can delete tenant documents"
  ON tenant_documents FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT t.id FROM tenants t
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
--   tenants           — CRM records with Right to Rent tracking
--   guarantors        — org_id auto-synced via sync_guarantor_org_id
--   tenant_references — employment, landlord, credit check vetting
--   tenant_documents  — identity docs (passport, BRP, visa, etc.)
--
-- NEXT MIGRATION: 004_tenancies.sql
--   → tenancies, tenancy_tenants, renewals, terminations,
--     tenancy_documents
--
-- HOW TO VERIFY:
--   Supabase → Table Editor: check all 4 tables exist.
--   Check tenants.right_to_rent_status default = 'not_checked'.
--   Insert a guarantor without setting org_id → trigger should
--   auto-populate it from the linked tenant.
-- ================================================================
