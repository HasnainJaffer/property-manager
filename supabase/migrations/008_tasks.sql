-- ================================================================
-- MIGRATION: 008_tasks.sql
-- Project:   Property Management Platform
-- Purpose:   Task layer — organisation-wide task management with
--            optional links to properties, units, and issues.
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 006_maintenance.sql
--
-- WHAT THIS FILE BUILDS:
--   1. tasks             — action items for the org with status, priority, due date
--   2. task_assignments  — many-to-many: tasks assigned to team members
--   3. Triggers          — updated_at on tasks
--   4. Indexes           — fast lookups by org, property, assignee, status, due date
--   5. RLS policies      — org-scoped; assignees can see their tasks
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--   002_properties.sql  (properties, units — tasks optionally link to these)
--   006_maintenance.sql (issues — tasks can be spawned from a maintenance issue)
--
-- KEY DESIGN DECISIONS:
--   - Tasks are intentionally separate from issues. An issue is a reported
--     defect; a task is an action item (which may or may not be related to
--     an issue). This keeps the maintenance reporting flow clean while
--     allowing general-purpose task management.
--   - property_id uses ON DELETE CASCADE: if a property is deleted, its
--     tasks go with it. This is the expected user experience.
--   - unit_id uses ON DELETE SET NULL: tasks survive unit deletion but
--     lose the unit association. The property link is the primary one.
--   - issue_id uses ON DELETE SET NULL: a task can outlive its linked issue
--     (e.g. the issue is closed but follow-up paperwork is still pending).
--   - task_assignments is a junction table to support assigning a task to
--     multiple team members (e.g. two-person jobs).
-- ================================================================


-- ================================================================
-- SECTION 1: TASKS
-- ================================================================

CREATE TABLE tasks (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE RESTRICT,

  -- Optional entity links
  property_id     UUID        REFERENCES properties(id) ON DELETE CASCADE,
  unit_id         UUID        REFERENCES units(id) ON DELETE SET NULL,
  issue_id        UUID        REFERENCES issues(id) ON DELETE SET NULL,

  -- Core fields
  title           TEXT        NOT NULL,
  description     TEXT,

  task_type       TEXT        NOT NULL DEFAULT 'general'
                              CHECK (task_type IN (
                                'maintenance', 'compliance', 'admin',
                                'inspection', 'financial', 'general'
                              )),

  status          TEXT        NOT NULL DEFAULT 'todo'
                              CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled')),

  priority        TEXT        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('urgent', 'high', 'medium', 'low')),

  due_date        DATE,
  completed_at    TIMESTAMPTZ,

  notes           TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT true,

  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ================================================================
-- SECTION 2: TASK ASSIGNMENTS
--
-- Links a task to one or more team members (users).
-- assigned_by tracks who delegated the task for audit purposes.
-- UNIQUE constraint prevents double-assigning the same user to a task.
-- ================================================================

CREATE TABLE task_assignments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (task_id, user_id)
);


-- ================================================================
-- SECTION 3: INDEXES
-- ================================================================

-- tasks
CREATE INDEX idx_tasks_org_id          ON tasks(org_id);
CREATE INDEX idx_tasks_property_id     ON tasks(property_id);
CREATE INDEX idx_tasks_unit_id         ON tasks(unit_id);
CREATE INDEX idx_tasks_issue_id        ON tasks(issue_id);
CREATE INDEX idx_tasks_status          ON tasks(status);
CREATE INDEX idx_tasks_priority        ON tasks(priority);
CREATE INDEX idx_tasks_due_date        ON tasks(due_date);
CREATE INDEX idx_tasks_org_status      ON tasks(org_id, status);
CREATE INDEX idx_tasks_created_by      ON tasks(created_by);

-- task_assignments
CREATE INDEX idx_task_assignments_task_id  ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user_id  ON task_assignments(user_id);


-- ================================================================
-- SECTION 4: ROW LEVEL SECURITY
--
-- tasks:
--   - Org members (excluding cleaner) can view tasks in their org.
--     Assigned users can also see their tasks even if they would
--     not normally see all tasks (e.g. maintenance role).
--   - Owners, managers, and staff can create tasks.
--   - Owners and managers can delete tasks.
--
-- task_assignments:
--   - Users can see assignments for tasks they can see.
--   - Owners and managers can assign/unassign tasks.
-- ================================================================

-- ---- TASKS ----
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT get_my_org_ids())
    OR id IN (
      SELECT task_id FROM task_assignments
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and staff can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'staff', 'maintenance')
    )
  );

CREATE POLICY "Admins and staff can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT p.org_id FROM profiles p
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager', 'staff', 'maintenance')
    )
  );

CREATE POLICY "Owners and managers can delete tasks"
  ON tasks FOR DELETE
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


-- ---- TASK ASSIGNMENTS ----
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view task assignments"
  ON task_assignments FOR SELECT
  TO authenticated
  USING (
    task_id IN (
      SELECT id FROM tasks
      WHERE org_id IN (SELECT get_my_org_ids())
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Owners and managers can manage task assignments"
  ON task_assignments FOR ALL
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      JOIN profiles p ON p.org_id = t.org_id
      JOIN roles r ON r.id = p.role_id
      WHERE p.user_id = auth.uid()
        AND p.is_active = true
        AND r.name IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
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
--   tasks            — action items, optionally linked to property/unit/issue
--   task_assignments — junction: tasks assigned to team members
--
-- NEXT MIGRATION: 009_documents.sql
--   → polymorphic document store
-- ================================================================
