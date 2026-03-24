-- ============================================================
-- KBB Collective CRM — Patch 012: Soft delete for jobs
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add deleted_at timestamp. NULL = active, non-NULL = deleted.
-- No existing data is affected — all rows remain NULL by default.
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
