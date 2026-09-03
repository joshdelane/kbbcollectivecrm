-- ============================================================
-- KBB Collective CRM — Patch 017
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Snag items: checklist rows for a job's Project Management snag list ───
CREATE TABLE IF NOT EXISTS snag_items (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  is_done     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE snag_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "snag_items_select" ON snag_items;
DROP POLICY IF EXISTS "snag_items_insert" ON snag_items;
DROP POLICY IF EXISTS "snag_items_update" ON snag_items;
DROP POLICY IF EXISTS "snag_items_delete" ON snag_items;

-- Scoped via the parent job's organisation, same pattern as quote_lines
CREATE POLICY "snag_items_select" ON snag_items
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "snag_items_insert" ON snag_items
  FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "snag_items_update" ON snag_items
  FOR UPDATE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "snag_items_delete" ON snag_items
  FOR DELETE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE INDEX IF NOT EXISTS snag_items_job_id_idx ON snag_items (job_id);

-- ── 2. Terms & conditions text, printed on quotes — one per organisation ─────
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT;
