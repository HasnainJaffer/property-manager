-- ================================================================
-- MIGRATION: 002_properties.sql
-- Project:   Property Management Platform
-- Purpose:   Physical asset layer — property types, properties,
--            unit types, units, amenities, and unit amenities.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 001_foundation.sql
--
-- WHAT THIS FILE BUILDS:
--   1. property_types   — lookup: house, flat, bungalow, HMO, etc.
--   2. properties       — physical buildings owned/managed by an org
--   3. unit_types       — lookup: studio, 1-bed, 2-bed, room, etc.
--   4. amenities        — lookup: parking, garden, dishwasher, etc.
--   5. units            — lettable spaces within a property
--   6. unit_amenities   — junction: which amenities each unit has
--   7. Triggers         — auto-update updated_at; enforce units.org_id
--   8. Indexes          — fast lookups by org, property, status
--   9. RLS policies     — org-scoped data isolation
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--
-- KEY DESIGN DECISIONS:
--   - units.org_id is denormalised from properties.org_id for RLS performance.
--     A trigger (trg_units_set_org_id) keeps it in sync automatically.
--   - Lookup tables (property_types, unit_types, amenities) have no org_id —
--     they are global reference data visible to all users.
--   - Deletion: deleting a property cascades to its units and unit_amenities.
--     Properties themselves are RESTRICT-protected (cannot delete an org that
--     still has properties).
-- ================================================================


-- ================================================================
-- SECTION 1: PROPERTY TYPES
--
-- A lookup table for the physical type of a building.
-- Separate from organisation_types (which is the portfolio model).
-- Example: a BTL org can own terraced houses, flats, and bungalows.
-- ================================================================

CREATE TABLE property_types (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,  -- slug used in code e.g. 'semi_detached'
  label       TEXT        NOT NULL,         -- display name e.g. 'Semi-Detached House'
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO property_types (name, label, sort_order) VALUES
  ('terraced',        'Terraced House',       1),
  ('semi_detached',   'Semi-Detached House',  2),
  ('detached',        'Detached House',       3),
  ('bungalow',        'Bungalow',             4),
  ('flat',            'Flat / Apartment',     5),
  ('maisonette',      'Maisonette',           6),
  ('studio',          'Studio Flat',          7),
  ('hmo',             'HMO',                  8),
  ('commercial',      'Commercial',           9),
  ('land',            'Land',                 10),
  ('other',           'Other',                11);


-- ================================================================
-- SECTION 2: PROPERTIES
--
-- A property is a physical building or land asset owned or managed
-- by an organisation. It may contain one or many lettable units.
--
-- Examples:
--   - A terraced house at 42 Church Lane → typically one unit
--     (the whole house is let to one tenancy)
--   - A converted Victorian building with 6 flats → 6 units
--   - An HMO with 5 bedrooms → 5 units (one per room)
--
-- Financial fields (purchase_price, current_valuation, mortgage)
-- are optional — not all landlords will want to track them, but
-- they are needed for the portfolio valuation KPI on the dashboard.
-- ================================================================

CREATE TABLE properties (
  id                   UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id               UUID          NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_type_id     UUID          NOT NULL REFERENCES property_types(id),

  -- Identification
  name                 TEXT          NOT NULL,  -- e.g. "42 Church Lane" or "Willow Court"
  internal_ref         TEXT,                    -- your own reference e.g. "PROP-001"

  -- Address (UK format)
  address_line1        TEXT          NOT NULL,
  address_line2        TEXT,
  city                 TEXT          NOT NULL,
  county               TEXT,
  postcode             TEXT          NOT NULL,
  country              TEXT          NOT NULL DEFAULT 'GB',

  -- Financial
  purchase_price       NUMERIC(12,2),
  purchase_date        DATE,
  current_valuation    NUMERIC(12,2),
  valuation_date       DATE,

  -- Mortgage
  mortgage_lender      TEXT,
  mortgage_account_ref TEXT,
  mortgage_monthly     NUMERIC(10,2),

  -- Metadata
  description          TEXT,
  notes                TEXT,
  is_active            BOOLEAN       NOT NULL DEFAULT true,

  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 3: UNIT TYPES
--
-- Describes the configuration of a lettable unit.
-- These are used in property listings, searches, and reports.
-- 'room' is used for HMO room-by-room lets.
-- 'whole_house' is used when a single-unit property is let as-is.
-- ================================================================

CREATE TABLE unit_types (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO unit_types (name, label, sort_order) VALUES
  ('studio',          'Studio',           1),
  ('one_bed',         '1 Bedroom',        2),
  ('two_bed',         '2 Bedroom',        3),
  ('three_bed',       '3 Bedroom',        4),
  ('four_bed',        '4 Bedroom',        5),
  ('five_bed_plus',   '5+ Bedroom',       6),
  ('room',            'Room (HMO)',        7),
  ('whole_house',     'Whole House',      8),
  ('commercial_unit', 'Commercial Unit',  9);


-- ================================================================
-- SECTION 4: AMENITIES
--
-- A global lookup of features a unit can have.
-- Linked to units via the unit_amenities junction table.
-- Category groups amenities for display in the UI.
-- ================================================================

CREATE TABLE amenities (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE,
  label       TEXT        NOT NULL,
  category    TEXT        NOT NULL
                          CHECK (category IN ('appliances', 'outdoor', 'parking', 'heating', 'general')),
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO amenities (name, label, category, sort_order) VALUES
  -- Appliances
  ('washing_machine',    'Washing Machine',     'appliances',  1),
  ('dishwasher',         'Dishwasher',          'appliances',  2),
  ('fridge_freezer',     'Fridge Freezer',      'appliances',  3),
  ('oven',               'Oven / Hob',          'appliances',  4),
  ('microwave',          'Microwave',           'appliances',  5),
  ('tumble_dryer',       'Tumble Dryer',        'appliances',  6),
  -- Outdoor
  ('garden',             'Garden',              'outdoor',     10),
  ('patio',              'Patio / Terrace',     'outdoor',     11),
  ('balcony',            'Balcony',             'outdoor',     12),
  -- Parking
  ('parking_off_road',   'Off-Road Parking',    'parking',     20),
  ('parking_garage',     'Garage',              'parking',     21),
  ('parking_allocated',  'Allocated Parking',   'parking',     22),
  -- Heating
  ('central_heating',    'Central Heating',     'heating',     30),
  ('underfloor_heating', 'Underfloor Heating',  'heating',     31),
  ('double_glazing',     'Double Glazing',      'heating',     32),
  -- General
  ('broadband',          'Broadband Included',  'general',     40),
  ('bills_included',     'Bills Included',      'general',     41),
  ('storage',            'Storage / Loft',      'general',     42),
  ('wheelchair_access',  'Wheelchair Access',   'general',     43),
  ('pet_friendly',       'Pet Friendly',        'general',     44);


-- ================================================================
-- SECTION 5: UNITS
--
-- A unit is the lettable space. One property has one or more units.
--
-- Single house → one unit (unit_ref: "Whole Property")
-- Block of flats → one unit per flat (unit_ref: "Flat 1", "Flat 2")
-- HMO → one unit per room (unit_ref: "Room 1", "Room 2")
--
-- org_id is stored here (denormalised from properties.org_id) so
-- that RLS policies on units do not require a join to properties.
-- A trigger keeps it automatically in sync (see Section 7).
--
-- deposit_weeks: UK law caps deposits at 5 weeks rent (Housing Act
-- 2019 Tenant Fees Act). Default is 5; can be lower.
--
-- status tracks the current occupancy state of the unit, which
-- feeds the void-rate KPI on the dashboard.
-- ================================================================

CREATE TABLE units (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID          NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,
  property_id     UUID          NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit_type_id    UUID          NOT NULL REFERENCES unit_types(id),

  -- Identification
  unit_ref        TEXT          NOT NULL,    -- e.g. "Flat 1", "Room 3", "Whole Property"
  floor_number    SMALLINT,                  -- 0 = ground, null = not applicable

  -- Specifications
  bedrooms        SMALLINT      NOT NULL DEFAULT 0 CHECK (bedrooms >= 0),
  bathrooms       SMALLINT      NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  floor_area_sqft NUMERIC(8,2),
  floor_area_sqm  NUMERIC(8,2),
  max_occupants   SMALLINT,

  -- Financials
  target_rent     NUMERIC(10,2),             -- target asking rent (not the contractual amount)
  deposit_weeks   SMALLINT      NOT NULL DEFAULT 5
                                CHECK (deposit_weeks BETWEEN 1 AND 5),  -- UK Tenant Fees Act 2019

  -- Furnishing
  furnishing      TEXT          NOT NULL DEFAULT 'unfurnished'
                                CHECK (furnishing IN ('unfurnished', 'part_furnished', 'fully_furnished')),

  -- Status (drives void-rate KPI)
  status          TEXT          NOT NULL DEFAULT 'vacant'
                                CHECK (status IN ('vacant', 'occupied', 'under_maintenance', 'unavailable')),

  -- Metadata
  description     TEXT,
  notes           TEXT,
  is_active       BOOLEAN       NOT NULL DEFAULT true,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 6: UNIT AMENITIES (JUNCTION TABLE)
--
-- Links a unit to the amenities it has. Many-to-many.
-- notes can store extra detail (e.g. "Parking bay 12").
-- ================================================================

CREATE TABLE unit_amenities (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID        NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  amenity_id  UUID        NOT NULL REFERENCES amenities(id) ON DELETE RESTRICT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (unit_id, amenity_id)
);


-- ================================================================
-- SECTION 7: TRIGGER — ENFORCE units.org_id CONSISTENCY
--
-- units.org_id must always equal the org_id of its parent property.
-- This trigger runs on INSERT and UPDATE to derive org_id
-- automatically from properties, so callers never set it manually.
-- ================================================================

CREATE OR REPLACE FUNCTION sync_unit_org_id()
RETURNS TRIGGER AS $$
BEGIN
  SELECT org_id INTO NEW.org_id
  FROM properties
  WHERE id = NEW.property_id;

  IF NEW.org_id IS NULL THEN
    RAISE EXCEPTION 'Property % not found or has no org_id', NEW.property_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_units_set_org_id
  BEFORE INSERT OR UPDATE OF property_id ON units
  FOR EACH ROW EXECUTE FUNCTION sync_unit_org_id();


-- ================================================================
-- SECTION 8: INDEXES
-- ================================================================

-- property_types
CREATE INDEX idx_property_types_name         ON property_types(name);

-- properties
CREATE INDEX idx_properties_org_id           ON properties(org_id);
CREATE INDEX idx_properties_type             ON properties(property_type_id);
CREATE INDEX idx_properties_postcode         ON properties(postcode);
CREATE INDEX idx_properties_active           ON properties(is_active);

-- unit_types
CREATE INDEX idx_unit_types_name             ON unit_types(name);

-- amenities
CREATE INDEX idx_amenities_category          ON amenities(category);

-- units
CREATE INDEX idx_units_org_id               ON units(org_id);
CREATE INDEX idx_units_property_id          ON units(property_id);
CREATE INDEX idx_units_unit_type            ON units(unit_type_id);
CREATE INDEX idx_units_status               ON units(status);
CREATE INDEX idx_units_active               ON units(is_active);

-- unit_amenities
CREATE INDEX idx_unit_amenities_unit_id     ON unit_amenities(unit_id);
CREATE INDEX idx_unit_amenities_amenity_id  ON unit_amenities(amenity_id);


-- ================================================================
-- SECTION 9: ROW LEVEL SECURITY
--
-- Pattern mirrors 001_foundation.sql — inline subqueries on profiles.
--
-- Lookup tables (property_types, unit_types, amenities) are global
-- reference data: any authenticated user can read them.
--
-- properties and units are org-scoped:
--   - All org members can SELECT (viewers, staff, cleaners, etc.)
--   - Only owners and managers can INSERT and UPDATE
--   - Only owners can DELETE (destructive — cascades to units)
--
-- unit_amenities follow the same org-scope as their parent unit,
-- resolved via a join through units.
-- ================================================================

-- ---- PROPERTY TYPES ---- (global lookup, read-only)
ALTER TABLE property_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view property types"
  ON property_types FOR SELECT
  USING (true);


-- ---- UNIT TYPES ---- (global lookup, read-only)
ALTER TABLE unit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view unit types"
  ON unit_types FOR SELECT
  USING (true);


-- ---- AMENITIES ---- (global lookup, read-only)
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view amenities"
  ON amenities FOR SELECT
  USING (true);


-- ---- PROPERTIES ----
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can insert properties"
  ON properties FOR INSERT
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

CREATE POLICY "Admins can update properties"
  ON properties FOR UPDATE
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

CREATE POLICY "Owners can delete properties"
  ON properties FOR DELETE
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


-- ---- UNITS ----
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view units"
  ON units FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can insert units"
  ON units FOR INSERT
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

CREATE POLICY "Admins can update units"
  ON units FOR UPDATE
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

CREATE POLICY "Owners can delete units"
  ON units FOR DELETE
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


-- ---- UNIT AMENITIES ----
-- No org_id on this table — access is resolved through the parent unit.
ALTER TABLE unit_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view unit amenities"
  ON unit_amenities FOR SELECT
  TO authenticated
  USING (
    unit_id IN (
      SELECT u.id FROM units u
      WHERE u.org_id IN (
        SELECT org_id FROM profiles
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can insert unit amenities"
  ON unit_amenities FOR INSERT
  TO authenticated
  WITH CHECK (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN profiles p ON p.org_id = u.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  );

CREATE POLICY "Admins can delete unit amenities"
  ON unit_amenities FOR DELETE
  TO authenticated
  USING (
    unit_id IN (
      SELECT u.id FROM units u
      JOIN profiles p ON p.org_id = u.org_id
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
--   property_types   — 11 seeded types
--   properties       — physical assets with UK address fields
--   unit_types       — 9 seeded types
--   amenities        — 20 seeded amenities across 5 categories
--   units            — lettable spaces, org_id auto-synced via trigger
--   unit_amenities   — junction: amenities per unit
--
-- NEXT MIGRATION: 003_tenants.sql
--   → tenants, guarantors, references, tenant documents
--
-- HOW TO VERIFY:
--   Supabase → Table Editor: check all 6 tables exist with data.
--   Supabase → Auth → Policies: confirm RLS on properties and units.
--   Insert a property without org membership → should be blocked.
-- ================================================================
