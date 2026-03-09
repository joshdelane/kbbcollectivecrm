-- ============================================================
-- KBB Collective CRM — Patch 006
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Track which revision each quote line belongs to
ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS revision_number INT NOT NULL DEFAULT 1;

-- Track the current latest revision number on the job
-- (kept in sync whenever a revision is created or saved)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS quote_revision INT NOT NULL DEFAULT 1;
