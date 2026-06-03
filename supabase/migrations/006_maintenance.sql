-- ================================================================
-- MIGRATION: 006_maintenance.sql
-- Project:   Property Management Platform
-- Purpose:   Maintenance layer — issues, work orders, notes, vendors.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 005_rent.sql
--
-- WHAT THIS FILE BUILDS:
--   1. vendors          — contractors and service providers
--   2. issues           — maintenance requests (from tenants, inspection, etc.)
--   3. work_orders      — formal repair jobs derived from issues
--   4. work_order_notes — progress notes on a work order
--   5. Triggers         — updated_at on mutable tables
--   6. Indexes          — fast lookups by org, property, status, priority
--   7. RLS policies     — org-scoped data isolation
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--   002_properties.sql  (properties, units — issues reference both)
--
-- KEY DESIGN DECISIONS:
--   - issues and work_orders are separate. An issue is a reported problem;
--     a work order is the formal instruction to fix it. An issue can have
--     zero or one work orders. This keeps the reporting (tenant-facing)
--     separate from the operational scheduling (contractor-facing).
--   - Issues can be raised by a tenant, manager, or via a routine inspection.
--     source tracks this so the org knows which channel to communicate through.
--   - Priority levels map to expected response times (UK best practice):
--       emergency  — immediate (gas leak, no heating in winter, flooding)
--       urgent     — within 24h (no hot water, broken lock)
--       high       — within 3 days
--       medium     — within 7 days
--       low        — within 28 days
--   - unit_id is nullable on issues because some issues affect the entire
--     property rather than a specific unit (e.g. roof, communal areas).
--   - vendors are org-scoped CRM records for contractors. They are not
--     system users — they don't have login access.
-- ================================================================


-- ================================================================
-- SECTION 1: VENDORS
--
-- Contractors, tradespeople, and service providers used by the org.
-- Referenced by work_orders.vendor_id to track who is doing the work.
-- ================================================================

CREATE TABLE vendors (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,

  name            TEXT        NOT NULL,
  trade           TEXT,       -- e.g. 'Plumber', 'Electrician', 'Gas Engineer'
  contact_name    TEXT,
  email           TEXT,
  phone           TEXT,
  address_line1   TEXT,
  city            TEXT,
  postcode        TEXT,

  -- Compliance / insurance
  gas_safe_number TEXT,       -- Gas Safe Registration number
  niceic_number   TEXT,       -- NICEIC membership number
  insurance_expiry DATE,

  is_active       BOOLEAN     NOT NULL DEFAULT true,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 2: ISSUES
--
-- A maintenance issue is a reported problem. It begins as a raw
-- report and progresses through a status lifecycle until resolved.
--
-- STATUS LIFECYCLE:
--   open → scheduled → in_progress → completed
--   open → cancelled  (if not actioned)
--
-- PRIORITY LEVELS (UK residential best practice):
--   emergency — immediate response required
--   urgent    — within 24 hours
--   high      — within 3 days
--   medium    — within 7 days
--   low       — within 28 days (routine/cosmetic)
--
-- SOURCE:
--   tenant      — raised by tenant (phone, email, portal)
--   manager     — raised by property manager during visit
--   inspection  — found during scheduled inspection
--   routine     — scheduled maintenance (e.g. annual boiler service)
--   other       — any other source
-- ================================================================

CREATE TABLE issues (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_id     UUID        NOT NULL REFERENCES properties(id) ON DELETE RESTRICT,
  unit_id         UUID        REFERENCES units(id) ON DELETE SET NULL,

  title           TEXT        NOT NULL,
  description     TEXT,

  source          TEXT        NOT NULL DEFAULT 'tenant'
                              CHECK (source IN (
                                'tenant', 'manager', 'inspection', 'routine', 'other'
                              )),

  priority        TEXT        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN (
                                'emergency', 'urgent', 'high', 'medium', 'low'
                              )),

  status          TEXT        NOT NULL DEFAULT 'open'
                              CHECK (status IN (
                                'open', 'scheduled', 'in_progress', 'completed', 'cancelled'
                              )),

  reported_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date  DATE,
  completed_date  DATE,

  estimated_cost  NUMERIC(10,2),
  actual_cost     NUMERIC(10,2),

  notes           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 3: WORK ORDERS
--
-- A work order is a formal instruction to a vendor to carry out
-- work. Derived from an issue (issue_id). One issue → zero or one
-- work order (a second quote/attempt creates a new work order, but
-- the issue_id stays the same — the old work order is cancelled).
--
-- STATUS LIFECYCLE:
--   draft → sent → accepted → in_progress → completed
--   draft / sent / accepted → cancelled
-- ================================================================

CREATE TABLE work_orders (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  issue_id        UUID        NOT NULL REFERENCES issues(id) ON DELETE RESTRICT,
  vendor_id       UUID        REFERENCES vendors(id) ON DELETE SET NULL,

  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN (
                                'draft', 'sent', 'accepted', 'in_progress', 'completed', 'cancelled'
                              )),

  description     TEXT,
  scope_of_work   TEXT,

  quoted_amount   NUMERIC(10,2),
  agreed_amount   NUMERIC(10,2),
  final_amount    NUMERIC(10,2),

  scheduled_start DATE,
  scheduled_end   DATE,
  completed_date  DATE,

  purchase_order_ref TEXT,
  invoice_ref     TEXT,

  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 4: WORK ORDER NOTES
--
-- Progress notes on a work order — can be added by property manager
-- or (in future) by the vendor via a portal. Immutable — add new
-- notes rather than editing existing ones.
-- ================================================================

CREATE TABLE work_order_notes (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_order_id   UUID        NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,

  note            TEXT        NOT NULL,
  author_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at: notes are immutable
);


-- ================================================================
-- SECTION 5: INDEXES
-- ================================================================

-- vendors
CREATE INDEX idx_vendors_org_id         ON vendors(org_id);
CREATE INDEX idx_vendors_is_active      ON vendors(is_active) WHERE is_active = true;

-- issues
CREATE INDEX idx_issues_org_id          ON issues(org_id);
CREATE INDEX idx_issues_property_id     ON issues(property_id);
CREATE INDEX idx_issues_unit_id         ON issues(unit_id);
CREATE INDEX idx_issues_status          ON issues(status);
CREATE INDEX idx_issues_priority        ON issues(priority);
CREATE INDEX idx_issues_reported_date   ON issues(reported_date);
CREATE INDEX idx_issues_org_status      ON issues(org_id, status);

-- work_orders
CREATE INDEX idx_work_orders_org_id     ON work_orders(org_id);
CREATE INDEX idx_work_orders_issue_id   ON work_orders(issue_id);
CREATE INDEX idx_work_orders_vendor_id  ON work_orders(vendor_id);
CREATE INDEX idx_work_orders_status     ON work_orders(status);

-- work_order_notes
CREATE INDEX idx_work_order_notes_work_order_id ON work_order_notes(work_order_id);


-- ================================================================
-- SECTION 6: ROW LEVEL SECURITY
-- ================================================================

-- ---- VENDORS ----
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view vendors"
  ON vendors FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins can manage vendors"
  ON vendors FOR ALL
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


-- ---- ISSUES ----
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view issues"
  ON issues FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins and maintenance staff can insert issues"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance', 'staff')
    )
  );

CREATE POLICY "Admins and maintenance staff can update issues"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance', 'staff')
    )
  );


-- ---- WORK ORDERS ----
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view work orders"
  ON work_orders FOR SELECT
  TO authenticated
  USING (
    issue_id IN (
      SELECT id FROM issues
      WHERE org_id IN (SELECT get_my_org_ids())
    )
  );

CREATE POLICY "Admins can manage work orders"
  ON work_orders FOR ALL
  TO authenticated
  USING (
    issue_id IN (
      SELECT i.id FROM issues i
      JOIN profiles p ON p.org_id = i.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance')
    )
  )
  WITH CHECK (
    issue_id IN (
      SELECT i.id FROM issues i
      JOIN profiles p ON p.org_id = i.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'maintenance')
    )
  );


-- ---- WORK ORDER NOTES ----
ALTER TABLE work_order_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view work order notes"
  ON work_order_notes FOR SELECT
  TO authenticated
  USING (
    work_order_id IN (
      SELECT wo.id FROM work_orders wo
      JOIN issues i ON i.id = wo.issue_id
      WHERE i.org_id IN (SELECT get_my_org_ids())
    )
  );

CREATE POLICY "Admins can add work order notes"
  ON work_order_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    work_order_id IN (
      SELECT wo.id FROM work_orders wo
      JOIN issues i ON i.id = wo.issue_id
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
--   vendors           — contractor/service provider records
--   issues            — maintenance requests and reports
--   work_orders       — formal repair instructions to vendors
--   work_order_notes  — progress notes on work orders
--
-- NEXT MIGRATION: 007_compliance.sql
--   → certificates, hmo_licences, inspections, inspection_items
--
-- HOW TO VERIFY:
--   Insert an issue, then a work_order referencing it.
--   Verify RLS: a manager can see and update issues in their org,
--   but not issues from another org.
-- ================================================================
