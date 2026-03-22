-- ============================================================
-- KBB Collective CRM — Patch 010: Discounts + Address Line 1
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Add discount_percent to quote_lines ────────────────────
ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

-- ── 2. Add address_line_1 to jobs ─────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS address_line_1 TEXT;
