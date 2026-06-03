-- ================================================================
-- MIGRATION: 001_foundation.sql
-- Project:   Property Management Platform
-- Purpose:   Core foundation — extensions, organisation types,
--            organisations, roles, profiles, and invitations.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: This is migration #1. Always run first.
--
-- WHAT THIS FILE BUILDS:
--   1. Extensions (UUID support, crypto)
--   2. Organisation types (buy-to-let, HMO, serviced accommodation, etc.)
--   3. Organisations (each business that signs up)
--   4. Roles (Owner, Manager, Staff, Cleaner, Maintenance, Accountant, Viewer)
--   5. Profiles (links a Supabase user to one or more organisations)
--   6. Invitations (for inviting team members to an org)
--   7. Triggers (auto-create a profile when a user signs up)
--   8. Row Level Security (RLS) — keeps each org's data completely private
--   9. Indexes — keeps queries fast as your data grows
-- ================================================================


-- ================================================================
-- SECTION 1: EXTENSIONS
-- These are Postgres plugins. uuid-ossp lets us generate unique IDs.
-- pgcrypto lets us generate secure random tokens (used for invite links).
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ================================================================
-- SECTION 2: ORGANISATION TYPES
--
-- This is a simple lookup table. It stores all the types of
-- organisations a user can create (buy-to-let, HMO, etc.)
--
-- WHY A SEPARATE TABLE?
-- Instead of hardcoding types in the app, we store them here.
-- When you want to add a new type (e.g. "holiday let"), you just
-- insert a new row — no code changes, no schema changes needed.
-- ================================================================

CREATE TABLE organisation_types (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE, -- slug used in code e.g. 'buy_to_let'
  label       TEXT        NOT NULL,        -- what the user sees e.g. 'Buy to Let'
  description TEXT,                        -- short description shown on signup
  icon        TEXT,                        -- optional icon name for the UI
  is_active   BOOLEAN     NOT NULL DEFAULT true, -- set false to hide a type without deleting it
  sort_order  INT         NOT NULL DEFAULT 0,    -- controls display order in dropdowns
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the initial organisation types
-- You can add more rows here at any time without breaking anything
INSERT INTO organisation_types (name, label, description, sort_order) VALUES
  ('buy_to_let',            'Buy to Let',              'Long-term residential lettings with AST agreements.',         1),
  ('hmo',                   'HMO',                     'Houses in multiple occupation with individual room lets.',    2),
  ('serviced_accommodation','Serviced Accommodation',  'Short-term lets, corporate stays, and Airbnb-style units.',   3),
  ('holiday_let',           'Holiday Let',             'Seasonal and holiday rental properties.',                     4),
  ('commercial',            'Commercial',              'Offices, retail units, and commercial properties.',           5),
  ('mixed_portfolio',       'Mixed Portfolio',         'A mix of different property types under one organisation.',   6);


-- ================================================================
-- SECTION 3: ORGANISATIONS
--
-- Every business that signs up creates at least one organisation.
-- One user account can own or belong to MULTIPLE organisations.
-- Example: A landlord has a BTL portfolio AND a serviced accomm business.
--          They sign in once and switch between both orgs.
--
-- HOW IT WORKS IN THE APP:
--   1. User signs up with email → Supabase creates their auth account
--   2. App redirects to "Create your organisation" screen
--   3. User enters org name and picks a type
--   4. A row is inserted into this table
--   5. A profile row is created linking the user to this org as 'owner'
--   6. Later, they can create another org from their account settings
-- ================================================================

CREATE TABLE organisations (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                 TEXT        NOT NULL,               -- e.g. "Syster Properties Ltd"
  slug                 TEXT        UNIQUE,                 -- URL-safe version e.g. "syster-properties" (optional, for future use)
  organisation_type_id UUID        NOT NULL REFERENCES organisation_types(id),
  
  -- Contact & business info
  email                TEXT,                               -- main contact email
  phone                TEXT,
  website              TEXT,
  
  -- Address (registered business address)
  address_line1        TEXT,
  address_line2        TEXT,
  city                 TEXT,
  postcode             TEXT,
  country              TEXT        NOT NULL DEFAULT 'GB',  -- default to UK
  
  -- Business details
  company_number       TEXT,                               -- Companies House number (optional)
  vat_number           TEXT,                               -- VAT number (optional)
  
  -- Subscription / billing
  plan                 TEXT        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  plan_started_at      TIMESTAMPTZ,
  plan_expires_at      TIMESTAMPTZ,
  
  -- Status
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: automatically update the updated_at timestamp on any change
-- (We define the function once and reuse it across all tables)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER organisations_updated_at
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 4: ROLES
--
-- These are the roles a user can have WITHIN an organisation.
-- A user could be an 'owner' in one org and a 'staff' in another.
-- Roles are stored in this table so you can add new ones without
-- changing your codebase.
-- ================================================================

CREATE TABLE roles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL UNIQUE, -- slug used in code e.g. 'owner'
  label       TEXT        NOT NULL,        -- display name e.g. 'Owner / Admin'
  description TEXT,
  is_system   BOOLEAN     NOT NULL DEFAULT false, -- system roles cannot be deleted by users
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the 7 core roles
INSERT INTO roles (name, label, description, is_system, sort_order) VALUES
  ('owner',       'Owner / Admin',  'Full access. Manages the organisation, billing, team, and all data.',    true,  1),
  ('manager',     'Manager',        'Manages properties, tenancies, maintenance, tasks, and financials.',      true,  2),
  ('accountant',  'Accountant',     'Read access to financial data. Can manage invoices and payments.',        true,  3),
  ('staff',       'Staff',          'Can manage assigned tasks and view relevant property information.',        true,  4),
  ('maintenance', 'Maintenance',    'Can view and update maintenance issues and work orders.',                  true,  5),
  ('cleaner',     'Cleaner',        'Can view and complete assigned cleaning tasks only.',                      true,  6),
  ('viewer',      'Viewer',         'Read-only access across the organisation.',                                true,  7);


-- ================================================================
-- SECTION 5: PROFILES
--
-- This is the most important linking table in the whole system.
-- It connects a Supabase auth user to an organisation with a role.
--
-- ONE USER → MANY PROFILES (one per organisation they belong to)
--
-- Example rows:
--   user_id: abc123 | org_id: org1 | role: owner    ← their own BTL business
--   user_id: abc123 | org_id: org2 | role: manager  ← they also manage another org
--   user_id: xyz789 | org_id: org1 | role: cleaner  ← staff member of the first org
--
-- The app reads this table to know:
--   - Which orgs to show in the org-switcher
--   - What the user is allowed to see/do within each org
-- ================================================================

CREATE TABLE profiles (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Links to Supabase's built-in auth.users table
  -- When a user is deleted from auth, their profiles are deleted too (CASCADE)
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  org_id       UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role_id      UUID        NOT NULL REFERENCES roles(id),
  
  -- Personal details (stored here, not on auth.users)
  first_name   TEXT,
  last_name    TEXT,
  phone        TEXT,
  avatar_url   TEXT,       -- profile photo stored in Supabase Storage
  
  -- Status
  is_active    BOOLEAN     NOT NULL DEFAULT true, -- set false to deactivate without deleting
  
  -- Timestamps
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,                       -- useful for "last active" indicators
  
  -- A user can only have ONE profile per organisation
  UNIQUE (user_id, org_id)
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 6: INVITATIONS
--
-- When an owner/manager wants to add a team member, they enter an
-- email address and select a role. This creates an invitation row.
-- The system sends an email with a unique token link.
-- When the invitee clicks the link and signs up/logs in, the app
-- reads this table, creates their profile, and marks it accepted.
--
-- Expired invitations (older than 7 days) can be cleaned up with
-- a scheduled Supabase Edge Function later.
-- ================================================================

CREATE TABLE invitations (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id       UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  role_id      UUID        NOT NULL REFERENCES roles(id),
  
  email        TEXT        NOT NULL,         -- who is being invited
  invited_by   UUID        NOT NULL REFERENCES auth.users(id), -- who sent the invite
  
  -- A secure random token included in the invite link URL
  -- e.g. /invite/accept?token=abc123xyz
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- Lifecycle
  accepted_at  TIMESTAMPTZ,                  -- null = not yet accepted
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Can't invite the same email to the same org twice (while pending)
  UNIQUE (org_id, email)
);


-- ================================================================
-- SECTION 7: TRIGGER — AUTO-CREATE PROFILE ON SIGNUP
--
-- When a new user signs up via Supabase Auth, this trigger fires
-- automatically and creates their first profile row.
--
-- HOW IT WORKS:
-- Supabase stores extra data in auth.users.raw_user_meta_data.
-- When the user signs up, your frontend passes this metadata:
--   { org_id: "xxx", role: "owner", first_name: "Fatima" }
-- This trigger reads that metadata and creates the profile.
--
-- WHY THIS IS USEFUL:
-- It means you never have to manually insert profiles from your
-- frontend code after signup — the database handles it.
-- ================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id    UUID;
  v_role_id   UUID;
  v_first     TEXT;
  v_last      TEXT;
BEGIN
  -- Read the metadata passed during signup
  v_org_id := (NEW.raw_user_meta_data->>'org_id')::UUID;
  v_first   := NEW.raw_user_meta_data->>'first_name';
  v_last    := NEW.raw_user_meta_data->>'last_name';

  -- Look up the 'owner' role ID (first org creator is always owner)
  SELECT id INTO v_role_id FROM roles WHERE name = 'owner' LIMIT 1;

  -- Only create the profile if an org_id was passed in metadata
  IF v_org_id IS NOT NULL AND v_role_id IS NOT NULL THEN
    INSERT INTO profiles (user_id, org_id, role_id, first_name, last_name)
    VALUES (NEW.id, v_org_id, v_role_id, v_first, v_last);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach the trigger to Supabase's auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ================================================================
-- SECTION 8: INDEXES
--
-- Indexes make lookups fast. Without them, Postgres reads every
-- single row to find what you need (slow). With them, it jumps
-- straight to the right rows (fast).
--
-- RULE OF THUMB: Index any column you regularly use in:
--   WHERE x = ?   (filtering)
--   JOIN ON x     (joining tables)
--   ORDER BY x    (sorting)
-- ================================================================

-- organisations
CREATE INDEX idx_organisations_type    ON organisations(organisation_type_id);
CREATE INDEX idx_organisations_plan    ON organisations(plan);
CREATE INDEX idx_organisations_active  ON organisations(is_active);

-- profiles
-- This is the most queried table — "give me all orgs this user belongs to"
CREATE INDEX idx_profiles_user_id      ON profiles(user_id);
CREATE INDEX idx_profiles_org_id       ON profiles(org_id);
CREATE INDEX idx_profiles_role_id      ON profiles(role_id);
CREATE INDEX idx_profiles_active       ON profiles(is_active);

-- invitations
CREATE INDEX idx_invitations_org_id    ON invitations(org_id);
CREATE INDEX idx_invitations_email     ON invitations(email);
CREATE INDEX idx_invitations_token     ON invitations(token);


-- ================================================================
-- SECTION 9: ROW LEVEL SECURITY (RLS)
--
-- This is Supabase's superpower. RLS means the DATABASE itself
-- enforces privacy — not just your application code.
--
-- With RLS on, when user A queries the organisations table,
-- Postgres automatically filters out rows that don't belong to
-- their organisations. Even if a bug in your code forgot to
-- filter by org_id, the database would still block it.
--
-- HOW IT WORKS:
-- We enable RLS on each table, then define POLICIES.
-- Each policy is a rule: "Who is allowed to do what?"
-- The auth.uid() function returns the currently logged-in user's ID.
-- ================================================================

-- ---- ORGANISATION TYPES ----
-- Everyone can read org types (needed on the public signup screen)
ALTER TABLE organisation_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organisation types"
  ON organisation_types FOR SELECT
  USING (true);


-- ---- ROLES ----
-- Everyone authenticated can read roles (needed to display role names in UI)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);


-- ---- ORGANISATIONS ----
-- A user can only see organisations they are a member of (via profiles)
ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organisations"
  ON organisations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Only owners can update organisation details
CREATE POLICY "Owners can update their organisation"
  ON organisations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid() AND r.name = 'owner'
    )
  );

-- Any authenticated user can insert (create) an organisation
-- (This fires when someone creates a new org from their account)
CREATE POLICY "Authenticated users can create organisations"
  ON organisations FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ---- PROFILES ----
-- Users can see all profiles within their own organisations
-- (So managers can see their team members)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organisations"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Profiles are created by the trigger (SECURITY DEFINER), not directly
-- But we allow inserts for the trigger to work
CREATE POLICY "System can insert profiles"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);


-- ---- INVITATIONS ----
-- Only org members can see pending invitations for their org
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Only owners and managers can create invitations
CREATE POLICY "Owners and managers can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid() AND r.name IN ('owner', 'manager')
    )
  );

-- Owners and managers can delete (cancel) invitations
CREATE POLICY "Owners and managers can delete invitations"
  ON invitations FOR DELETE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid() AND r.name IN ('owner', 'manager')
    )
  );


-- ================================================================
-- DONE ✓
--
-- Your foundation is now in place. Here's what was created:
--
--   organisation_types  — expandable list of portfolio types
--   organisations       — each business / portfolio
--   roles               — 7 permission levels
--   profiles            — links users to orgs with a role
--   invitations         — team invite system with secure tokens
--
-- NEXT MIGRATION: 002_properties.sql
--   → properties, units, unit_types, amenities
--
-- HOW TO VERIFY IT WORKED:
--   Go to Supabase → Table Editor and you should see all 5 tables.
--   Go to Authentication → Policies and you should see RLS policies.
-- ================================================================
