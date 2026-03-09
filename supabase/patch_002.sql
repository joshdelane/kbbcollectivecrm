-- ============================================================
-- KBB Collective CRM — Patch 002
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE jobs
  -- Remove renamed/replaced fields
  DROP COLUMN IF EXISTS kitchen_style,
  DROP COLUMN IF EXISTS initial_site_dimensions,
  DROP COLUMN IF EXISTS final_site_dimensions,
  DROP COLUMN IF EXISTS order_date,

  -- Add replacement fields
  ADD COLUMN IF NOT EXISTS site_dimensions_captured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pm_site_dimensions_captured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS order_valuation NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS dead_at TIMESTAMPTZ;
