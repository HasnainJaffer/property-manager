-- ================================================================
-- MIGRATION: 009_documents.sql
-- Project:   Property Management Platform
-- Purpose:   Polymorphic document store — one table for all file
--            attachments across the platform (ASTs, gas certs,
--            inventories, invoices, ID scans, photos, etc.)
--
-- Run in:    Supabase Dashboard → SQL Editor
-- Run order: Must run AFTER 008_tasks.sql
--
-- WHAT THIS FILE BUILDS:
--   1. documents     — file metadata + Supabase Storage path, linked
--                      to any entity via (entity_type, entity_id)
--   2. Indexes       — fast lookups by org, entity pair, document type
--   3. RLS policies  — org-scoped; resolved through the entity link
--
-- DEPENDS ON:
--   001_foundation.sql  (organisations, profiles, roles, update_updated_at fn)
--
-- KEY DESIGN DECISIONS:
--   - Polymorphic pattern: entity_type (TEXT) + entity_id (UUID) instead
--     of one nullable FK per entity type. This keeps the schema clean as
--     the number of entity types grows, but means there is NO database-level
--     FK enforcement on entity_id. Application code and the delete cascade
--     function must handle orphan cleanup.
--   - entity_type values match table names (singular) for clarity:
--       'property', 'unit', 'tenant', 'tenancy', 'certificate',
--       'issue', 'inspection', 'task'
--   - file_path stores the Supabase Storage object path (not a full URL).
--     Full URLs are constructed at runtime via supabase.storage.from('bucket').getPublicUrl(path).
--   - Bucket name is NOT stored — all documents live in the 'documents'
--     bucket. The entity_type/entity_id structure makes paths predictable:
--       documents/{entity_type}/{entity_id}/{filename}
--   - Documents are logically deleted via is_active = false rather than
--     hard-deleted, to preserve audit trails. The associated Storage object
--     should be deleted separately (via Storage API from server code).
--   - No updated_at: documents are immutable. Replace = archive old (set
--     is_active = false) and insert new. This preserves version history.
-- ================================================================


-- ================================================================
-- SECTION 1: DOCUMENTS
-- ================================================================

CREATE TABLE documents (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id          UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,

  -- Polymorphic entity link (no FK — enforced at application level)
  entity_type     TEXT        NOT NULL
                              CHECK (entity_type IN (
                                'property', 'unit', 'tenant', 'tenancy',
                                'certificate', 'issue', 'inspection', 'task'
                              )),
  entity_id       UUID        NOT NULL,

  -- Document classification
  document_type   TEXT        NOT NULL DEFAULT 'other'
                              CHECK (document_type IN (
                                -- Tenancy
                                'tenancy_agreement', 'guarantor_agreement',
                                'check_in_report', 'check_out_report',
                                'section_21', 'section_8', 'deposit_protection',
                                -- Compliance
                                'gas_certificate', 'eicr_report', 'epc_report',
                                'fire_risk_assessment', 'asbestos_report',
                                'pat_testing_report', 'hmo_licence',
                                -- Tenant
                                'right_to_rent', 'id_document',
                                -- Maintenance
                                'invoice', 'quote', 'work_order',
                                -- General
                                'insurance', 'mortgage', 'photo',
                                'correspondence', 'other'
                              )),

  -- File metadata
  name            TEXT        NOT NULL,   -- display name shown in UI
  file_path       TEXT        NOT NULL,   -- Supabase Storage object path
  file_size       BIGINT,                 -- bytes
  mime_type       TEXT,                   -- e.g. 'application/pdf', 'image/jpeg'

  -- Logical deletion
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  notes           TEXT,

  uploaded_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()

  -- No updated_at — documents are immutable; archive + reupload to update
);


-- ================================================================
-- SECTION 2: INDEXES
-- ================================================================

CREATE INDEX idx_documents_org_id      ON documents(org_id);
CREATE INDEX idx_documents_entity      ON documents(entity_type, entity_id);
CREATE INDEX idx_documents_entity_type ON documents(entity_type);
CREATE INDEX idx_documents_type        ON documents(document_type);
CREATE INDEX idx_documents_active      ON documents(is_active) WHERE is_active = true;
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);


-- ================================================================
-- SECTION 3: ROW LEVEL SECURITY
--
-- Access is resolved through org_id (which is stored directly on
-- the documents table, unlike some polymorphic patterns that require
-- a join to the parent entity).
--
-- documents:
--   - All org members can view active documents in their org.
--   - Owners, managers, and maintenance staff can upload documents.
--   - Owners and managers can archive (soft-delete) documents.
--   - Only owners can hard-delete document records.
-- ================================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view documents"
  ON documents FOR SELECT
  TO authenticated
  USING (org_id IN (SELECT get_my_org_ids()));

CREATE POLICY "Admins and maintenance can upload documents"
  ON documents FOR INSERT
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

CREATE POLICY "Admins can update documents"
  ON documents FOR UPDATE
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

CREATE POLICY "Owners can delete documents"
  ON documents FOR DELETE
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


-- ================================================================
-- DONE ✓
--
-- Tables created:
--   documents  — polymorphic file store for all entity types
--
-- Storage note:
--   Create a Supabase Storage bucket named 'documents' with:
--     - Public: false (private bucket)
--     - File size limit: 20MB
--     - Allowed MIME types: application/pdf, image/*
--   Storage RLS policies should mirror the document table policies.
--
-- NEXT MIGRATION: 010_notifications.sql
--   → notifications, audit_log
-- ================================================================
