-- ============================================================
-- KBB Collective CRM — Patch 003
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS project_manager_assigned UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fitting_days INTEGER;
