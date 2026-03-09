-- ============================================================
-- KBB Collective CRM — Full Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE)
-- ============================================================

-- Profiles table (mirrors auth.users, auto-populated on signup)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  company_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enquiry sources (user-managed list, editable from the app)
CREATE TABLE IF NOT EXISTS enquiry_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default sources
INSERT INTO enquiry_sources (name, sort_order) VALUES
  ('Website', 1),
  ('Referral', 2),
  ('Showroom', 3),
  ('Social Media', 4),
  ('Paid Ads', 5),
  ('Other', 99)
ON CONFLICT (name) DO NOTHING;

-- Jobs table (single table, stage field drives the board column)
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id TEXT UNIQUE NOT NULL,
  stage TEXT NOT NULL DEFAULT 'enquiries'
    CHECK (stage IN ('enquiries', 'qualified_leads', 'order_processing', 'project_management', 'archived')),

  -- Core customer info
  customer_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  postcode TEXT,
  enquiry_source TEXT,
  rough_budget NUMERIC(12, 2),
  notes TEXT,

  -- Assigned team members
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  designer_assigned UUID REFERENCES profiles(id) ON DELETE SET NULL,
  installer_assigned UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Order processing fields
  order_valuation NUMERIC(12, 2),
  proposed_install_date DATE,
  deposit_amount NUMERIC(12, 2),
  site_dimensions_captured BOOLEAN DEFAULT FALSE,

  -- Project management fields
  pm_site_dimensions_captured BOOLEAN DEFAULT FALSE,
  signed_off_install_date DATE,
  snag_list TEXT,
  project_signed_off BOOLEAN DEFAULT FALSE,

  -- Stage transition timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  qualified_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  order_placed_at TIMESTAMPTZ,
  signed_off_at TIMESTAMPTZ,
  dead_at TIMESTAMPTZ
);

-- ============================================================
-- Auto-generate KBB-YYYY-NNNNN job IDs
-- ============================================================
CREATE OR REPLACE FUNCTION generate_job_id()
RETURNS TRIGGER AS $$
DECLARE
  year_part TEXT;
  next_num INT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(job_id, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO next_num
  FROM jobs
  WHERE job_id LIKE 'KBB-' || year_part || '-%';

  NEW.job_id := 'KBB-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_job_id
  BEFORE INSERT ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION generate_job_id();

-- ============================================================
-- Auto-update updated_at on every change
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- Auto-create profile record when a user signs up
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiry_sources ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "Authenticated users can select jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read sources" ON enquiry_sources;
DROP POLICY IF EXISTS "Authenticated users can insert sources" ON enquiry_sources;

CREATE POLICY "Authenticated users can select jobs"
  ON jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert jobs"
  ON jobs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update jobs"
  ON jobs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read profiles"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read sources"
  ON enquiry_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sources"
  ON enquiry_sources FOR INSERT TO authenticated WITH CHECK (true);
