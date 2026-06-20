-- ================================================================
-- MIGRATION: 010_notifications.sql
-- Project:   Property Management Platform
-- Purpose:   Notification layer — user-facing in-app alerts and an
--            append-only audit log of all significant system actions.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 009_documents.sql
--
-- WHAT THIS FILE BUILDS:
--   1. notifications   — per-user alerts (rent overdue, cert expiring, etc.)
--   2. audit_log       — immutable record of every create/update/delete action
--   3. Indexes         — fast lookups by user (unread count), org, entity
--   4. RLS policies    — users see only their own notifications;
--                        owners/managers can view the audit log
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles)
--
-- KEY DESIGN DECISIONS:
--   - Notifications are per-user (user_id FK). When a manager adds a new
--     tenant, all owners receive a notification. The Edge Function / cron
--     job that generates notifications fans them out and inserts one row
--     per recipient.
--   - entity_type + entity_id is a soft polymorphic link with NO FK
--     constraint. If the referenced entity is deleted, the notification
--     row is left in place (stale link). The UI renders gracefully when
--     the entity no longer exists (e.g. "Property deleted").
--   - read_at is NULL for unread, TIMESTAMPTZ for read. This makes
--     unread-count queries fast: WHERE user_id = ? AND read_at IS NULL.
--   - notifications.org_id uses ON DELETE CASCADE: when an org is deleted
--     all its notifications go too.
--   - audit_log is append-only. There is no UPDATE or DELETE RLS policy.
--     Rows must never be deleted (compliance/legal requirement). Only
--     service_role can insert (via server-side code and Edge Functions).
--   - audit_log.changes uses JSONB to store { "field": [old, new] } diffs
--     for UPDATE actions. NULL for CREATE and DELETE.
-- ================================================================


-- ================================================================
-- SECTION 1: NOTIFICATIONS
-- ================================================================

CREATE TABLE notifications (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification category
  type            TEXT        NOT NULL
                              CHECK (type IN (
                                'rent_overdue',       -- charge is past due_date with no payment
                                'cert_expiring',      -- compliance cert expiring within 90 days
                                'cert_expired',       -- compliance cert has expired
                                'maintenance_update', -- issue or work order status changed
                                'task_assigned',      -- user was assigned a task
                                'invite_accepted',    -- invited team member accepted
                                'tenant_added',       -- new tenant added to an active tenancy
                                'deposit_due',        -- deposit not registered within 30 days
                                'tenancy_ending',     -- tenancy end_date approaching (60-day alert)
                                'general'             -- freeform notification from owner/manager
                              )),

  title           TEXT        NOT NULL,
  body            TEXT,

  -- Soft polymorphic link to the triggering entity
  entity_type     TEXT        CHECK (entity_type IN (
                                'property', 'unit', 'tenant', 'tenancy',
                                'certificate', 'issue', 'task', 'charge'
                              )),
  entity_id       UUID,

  -- State
  read_at         TIMESTAMPTZ,   -- NULL = unread

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — notifications are immutable; marking read sets read_at
);


-- ================================================================
-- SECTION 2: AUDIT LOG
--
-- Records every significant action in the system. Written exclusively
-- by server-side code (Route Handlers / Edge Functions) using the
-- service role key. Never written by client-side code.
--
-- Retained indefinitely — do NOT add a DELETE policy.
-- ================================================================

CREATE TABLE audit_log (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Who did it (NULL for system/cron actions)
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- What they did it to
  entity_type     TEXT        NOT NULL,  -- 'property', 'tenancy', 'tenant', etc.
  entity_id       UUID        NOT NULL,
  entity_label    TEXT,                  -- snapshot of display name at time of action

  -- What action
  action          TEXT        NOT NULL
                              CHECK (action IN (
                                'created', 'updated', 'deleted',
                                'status_changed', 'invited', 'accepted',
                                'payment_received', 'charge_waived',
                                'document_uploaded', 'other'
                              )),

  -- Detail
  changes         JSONB,      -- { "field": [old_value, new_value] } for 'updated'
  meta            JSONB,      -- any extra context (e.g. { "amount": 1200 })

  -- Request context (optional, set server-side)
  ip_address      INET,
  user_agent      TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- No updated_at — audit log is immutable
);


-- ================================================================
-- SECTION 3: INDEXES
-- ================================================================

-- notifications
CREATE INDEX idx_notifications_user_id     ON notifications(user_id);
CREATE INDEX idx_notifications_org_id      ON notifications(org_id);
CREATE INDEX idx_notifications_unread      ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_entity      ON notifications(entity_type, entity_id);
CREATE INDEX idx_notifications_type        ON notifications(type);
CREATE INDEX idx_notifications_created_at  ON notifications(created_at DESC);

-- audit_log
CREATE INDEX idx_audit_log_org_id          ON audit_log(org_id);
CREATE INDEX idx_audit_log_user_id         ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity          ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_action          ON audit_log(action);
CREATE INDEX idx_audit_log_created_at      ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_org_created     ON audit_log(org_id, created_at DESC);


-- ================================================================
-- SECTION 4: ROW LEVEL SECURITY
--
-- notifications:
--   - Users can only read their own notifications.
--   - Users can update (mark read) their own notifications.
--   - Server-side (service_role) inserts notifications — no INSERT
--     policy for authenticated role.
--   - No DELETE policy: notifications are soft-managed (stale ones
--     are hidden by the UI based on created_at, not hard-deleted).
--
-- audit_log:
--   - Owners and managers can read the audit log for their org.
--   - No INSERT, UPDATE, or DELETE policy for authenticated users.
--     All writes go through service_role (server-side code).
-- ================================================================

-- ---- NOTIFICATIONS ----
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own notifications as read"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---- AUDIT LOG ----
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can view audit log"
  ON audit_log FOR SELECT
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


-- ================================================================
-- DONE ✓
--
-- Tables created:
--   notifications  — per-user in-app alerts (rent, certs, tasks, etc.)
--   audit_log      — append-only system action history
--
-- Edge Functions to wire up later:
--   - rent-reminders: scan overdue charges → insert notifications
--   - cert-expiry-alerts: scan expiring certs → insert notifications
--   - Both should run nightly via Supabase cron
--
-- NEXT MIGRATION: 011_reporting.sql
--   → occupancy_snapshots, financial_snapshots, property_valuations
-- ================================================================
