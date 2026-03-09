-- ============================================================
-- KBB Collective CRM — Patch 005
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Track whether each line item has been ordered
ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS is_ordered BOOLEAN NOT NULL DEFAULT FALSE;

-- Cache the total retail value of the quote on the job
-- (updated automatically whenever quote lines are saved)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS quote_total NUMERIC(12, 2);
