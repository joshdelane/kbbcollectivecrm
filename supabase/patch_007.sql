-- ============================================================
-- KBB Collective CRM — Patch 007
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Quote line categories (Cabinetry, Appliances, Sinks and Taps, Worktops, Installation)
ALTER TABLE quote_lines
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Date the deposit was received (manually entered from qualified_leads stage)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS deposit_received_at DATE;

-- Date the client signed off the kitchen (manually entered in project management)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_sign_off_date DATE;

-- Worktop template visit date (single-day calendar event)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS worktop_template_date DATE;

-- Worktop installation date (single-day calendar event)
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS worktop_install_date DATE;
