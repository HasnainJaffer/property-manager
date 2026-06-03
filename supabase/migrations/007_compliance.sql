-- ================================================================
-- MIGRATION: 007_compliance.sql
-- Project:   Property Management Platform
-- Purpose:   Compliance layer — certificates, HMO licences,
--            inspections and inspection items.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 006_maintenance.sql
--
-- WHAT THIS FILE BUILDS:
--   1. certificates       — legal compliance certificates per property/unit
--   2. hmo_licences       — HMO licensing records (subset of properties)
--   3. inspections        — scheduled and completed property inspections
--   4. inspection_items   — individual condition items on an inspection
--   5. Triggers           — updated_at; auto-compute certificate status
--   6. Indexes            — fast lookups by org, property, expiry, status
--   7. RLS policies       — org-scoped data isolation
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--   002_properties.sql  (properties, units — certs reference both)
--
-- KEY DESIGN DECISIONS:
--   - certificates.status is auto-computed on INSERT and UPDATE by a trigger
--     based on expiry_date relative to the current date. This keeps the
--     dashboard alert badge and compliance table always accurate without
--     requiring a nightly job (though a nightly refresh is recommended
--     for production to catch certs that expire while no one is editing).
--   - Status thresholds: expired = past expiry, expiring_soon = within 90
--     days, valid = 90+ days remaining.
--   - Unit-level certificates: gas_safety and eicr apply to properties;
--     epc can apply to a specific unit in a block. unit_id is nullable.
--   - HMO licences are tracked separately from certificates because they
--     have additional regulatory fields (max occupants, issuing council).
--     Not all properties require an HMO licence.
--   - reminder_sent_* flags allow the notification system to track which
--     reminders have been sent so they are not duplicated.
-- ================================================================


-- ================================================================
-- SECTION 1: CERTIFICATES
--
-- Legal compliance certificates that landlords are required to hold.
--
-- CERTIFICATE TYPES AND RENEWAL FREQUENCIES:
--   gas_safety      — Annual. Mandatory for all properties with gas.
--                     Failure = up to £6,000 fine, cannot serve S21.
--   eicr            — Every 5 years. EICR = Electrical Installation
--                     Condition Report. Mandatory since 1 July 2020.
--   epc             — Every 10 years. Must be E or above for new lets.
--   fire_risk       — Varies. Required for HMOs and blocks of flats.
--   legionella      — Typically every 2 years. Risk assessment, not
--                     certificate — but tracked here for consistency.
--   pat_testing     — Portable Appliance Testing for furnished lets.
--                     Not strictly mandatory but best practice.
--   asbestos        — Required for properties built before 2000.
--   other           — Any certificate type not listed above.
--
-- STATUS LIFECYCLE (auto-computed by trigger):
--   valid           — expiry_date is 90+ days in the future
--   expiring_soon   — expiry_date is 1–90 days in the future
--   expired         — expiry_date is today or past
-- ================================================================

CREATE TABLE certificates (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  unit_id         UUID        REFERENCES units(id) ON DELETE SET NULL,

  certificate_type TEXT       NOT NULL
                              CHECK (certificate_type IN (
                                'gas_safety', 'eicr', 'epc', 'fire_risk',
                                'legionella', 'pat_testing', 'asbestos', 'other'
                              )),

  reference_number TEXT,
  issued_by        TEXT,
  issued_date      DATE       NOT NULL,
  expiry_date      DATE,      -- NULL = does not expire (e.g. asbestos survey)

  status           TEXT       NOT NULL DEFAULT 'valid'
                              CHECK (status IN ('valid', 'expiring_soon', 'expired', 'no_expiry')),

  -- Reminder tracking (set by notification system, not manually)
  reminder_sent_90 BOOLEAN    NOT NULL DEFAULT false,
  reminder_sent_60 BOOLEAN    NOT NULL DEFAULT false,
  reminder_sent_30 BOOLEAN    NOT NULL DEFAULT false,

  file_path        TEXT,      -- Supabase Storage path for the certificate document
  notes            TEXT,
  is_active        BOOLEAN    NOT NULL DEFAULT true,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_certificates_updated_at
  BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- Auto-compute status from expiry_date on INSERT and UPDATE
CREATE OR REPLACE FUNCTION compute_certificate_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NULL THEN
    NEW.status := 'no_expiry';
  ELSIF NEW.expiry_date < CURRENT_DATE THEN
    NEW.status := 'expired';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '90 days' THEN
    NEW.status := 'expiring_soon';
  ELSE
    NEW.status := 'valid';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_certificates_compute_status
  BEFORE INSERT OR UPDATE OF expiry_date ON certificates
  FOR EACH ROW EXECUTE FUNCTION compute_certificate_status();


-- ================================================================
-- SECTION 2: HMO LICENCES
--
-- Houses in Multiple Occupation (HMO) require a licence from the
-- local council. Not all properties require one — only those meeting
-- the HMO definition (5+ occupiers, 2+ households, shared facilities).
--
-- Licence types:
--   mandatory    — required for large HMOs (5+ occupiers / 3+ storeys)
--   additional   — council scheme extending mandatory licensing
--   selective    — applies to all rented properties in certain areas
-- ================================================================

CREATE TABLE hmo_licences (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,

  licence_type    TEXT        NOT NULL
                              CHECK (licence_type IN ('mandatory', 'additional', 'selective')),

  licence_number  TEXT,
  issuing_council TEXT,

  issued_date     DATE,
  expiry_date     DATE,

  status          TEXT        NOT NULL DEFAULT 'valid'
                              CHECK (status IN ('pending', 'valid', 'expiring_soon', 'expired', 'refused', 'revoked')),

  max_occupants   INT,
  max_households  INT,

  conditions      TEXT,       -- any conditions attached to the licence
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_hmo_licences_updated_at
  BEFORE UPDATE ON hmo_licences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 3: INSPECTIONS
--
-- Scheduled and completed property condition inspections.
--
-- INSPECTION TYPES:
--   routine        — periodic inspection (typically every 3–6 months)
--   check_in       — condition report at start of tenancy
--   check_out      — condition report at end of tenancy
--   inventory      — full inventory of contents and condition
--   emergency      — unplanned inspection (e.g. after reported damage)
-- ================================================================

CREATE TABLE inspections (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  unit_id         UUID        REFERENCES units(id) ON DELETE SET NULL,

  inspection_type TEXT        NOT NULL DEFAULT 'routine'
                              CHECK (inspection_type IN (
                                'routine', 'check_in', 'check_out', 'inventory', 'emergency'
                              )),

  status          TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN (
                                'scheduled', 'in_progress', 'completed', 'cancelled'
                              )),

  scheduled_date  DATE        NOT NULL,
  completed_date  DATE,

  inspector_name  TEXT,
  overall_condition TEXT      CHECK (overall_condition IN ('excellent', 'good', 'fair', 'poor')),

  notes           TEXT,
  report_file_path TEXT,      -- Supabase Storage path for the inspection report

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_inspections_updated_at
  BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 4: INSPECTION ITEMS
--
-- Individual condition items recorded during an inspection.
-- Each row is one item (e.g. "Kitchen — Oven — Good condition").
-- ================================================================

CREATE TABLE inspection_items (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inspection_id   UUID        NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,

  room            TEXT        NOT NULL,  -- e.g. 'Kitchen', 'Bedroom 1', 'Bathroom'
  item            TEXT        NOT NULL,  -- e.g. 'Oven', 'Carpet', 'Window'
  condition       TEXT        CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  action_required BOOLEAN     NOT NULL DEFAULT false,
  notes           TEXT,
  photo_path      TEXT,       -- Supabase Storage path for photo evidence

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: inspection items are immutable records
);


-- ================================================================
-- SECTION 5: INDEXES
-- ================================================================

-- certificates
CREATE INDEX idx_certificates_org_id       ON certificates(org_id);
CREATE INDEX idx_certificates_property_id  ON certificates(property_id);
CREATE INDEX idx_certificates_type         ON certificates(certificate_type);
CREATE INDEX idx_certificates_status       ON certificates(status);
CREATE INDEX idx_certificates_expiry_date  ON certificates(expiry_date);
CREATE INDEX idx_certificates_org_status   ON certificates(org_id, status);

-- hmo_licences
CREATE INDEX idx_hmo_licences_org_id       ON hmo_licences(org_id);
CREATE INDEX idx_hmo_licences_property_id  ON hmo_licences(property_id);
CREATE INDEX idx_hmo_licences_expiry_date  ON hmo_licences(expiry_date);

-- inspections
CREATE INDEX idx_inspections_org_id        ON inspections(org_id);
CREATE INDEX idx_inspections_property_id   ON inspections(property_id);
CREATE INDEX idx_inspections_scheduled_date ON inspections(scheduled_date);
CREATE INDEX idx_inspections_status        ON inspections(status);

-- inspection_items
CREATE INDEX idx_inspection_items_inspection_id ON inspection_items(inspection_id);


-- ================================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ================================================================

-- ---- CERTIFICATES ----
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins can insert certificates"
  ON certificates FOR INSERT
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

CREATE POLICY "Admins can update certificates"
  ON certificates FOR UPDATE
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

CREATE POLICY "Owners can delete certificates"
  ON certificates FOR DELETE
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


-- ---- HMO LICENCES ----
ALTER TABLE hmo_licences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view hmo licences"
  ON hmo_licences FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins can manage hmo licences"
  ON hmo_licences FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );


-- ---- INSPECTIONS ----
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins can manage inspections"
  ON inspections FOR ALL
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance')
    )
  );


-- ---- INSPECTION ITEMS ----
ALTER TABLE inspection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view inspection items"
  ON inspection_items FOR SELECT
  TO authenticated
  USING (
    inspection_id IN (
      SELECT id FROM inspections
      WHERE org_id IN (SELECT get_my_org_ids())
    )
  );

CREATE POLICY "Admins can add inspection items"
  ON inspection_items FOR INSERT
  TO authenticated
  WITH CHECK (
    inspection_id IN (
      SELECT i.id FROM inspections i
      JOIN profiles p ON p.org_id = i.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance')
    )
  );


-- ================================================================
-- DONE ✓
--
-- Tables created:
--   certificates      — legal compliance certs with auto-status trigger
--   hmo_licences      — HMO licensing records
--   inspections       — scheduled and completed inspections
--   inspection_items  — individual items on an inspection report
--
-- Functions created:
--   compute_certificate_status() — auto-sets status from expiry_date
--
-- NEXT MIGRATION: 008_tasks.sql
--   → tasks, task_assignments
--
-- HOW TO VERIFY:
--   Insert a certificate with expiry_date = CURRENT_DATE - 1:
--   → status should be automatically set to 'expired'
--   Insert another with expiry_date = CURRENT_DATE + 45:
--   → status should be 'expiring_soon'
-- ================================================================
