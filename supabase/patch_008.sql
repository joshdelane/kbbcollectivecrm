-- ============================================================
-- KBB Collective CRM — Patch 008: Multi-tenancy
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Create organisations table ────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  job_prefix TEXT NOT NULL DEFAULT 'KBB',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;

-- ── 2. Add organisation_id to data tables (nullable first) ───
ALTER TABLE profiles          ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE jobs               ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);
ALTER TABLE enquiry_sources    ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES organisations(id);

-- quote_lines will be scoped via their parent job (join-based RLS) — no extra column needed

-- ── 3. Migrate existing data into a default organisation ──────
-- Creates one org for all your existing data.
-- After running this, go to Supabase → Table Editor → organisations
-- and rename "My Organisation" to your actual company name.
DO $$
DECLARE
  default_org_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO organisations (id, name, job_prefix)
  VALUES (default_org_id, 'My Organisation', 'KBB')
  ON CONFLICT (id) DO NOTHING;

  UPDATE profiles         SET organisation_id = default_org_id WHERE organisation_id IS NULL;
  UPDATE jobs             SET organisation_id = default_org_id WHERE organisation_id IS NULL;
  UPDATE enquiry_sources  SET organisation_id = default_org_id WHERE organisation_id IS NULL;
END $$;

-- ── 4. Helper function — returns current user's org ID ────────
CREATE OR REPLACE FUNCTION get_my_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid()
$$;

-- ── 5. Atomic org creation function (used by /setup page) ────
-- Runs as postgres (SECURITY DEFINER) so it can bypass RLS
-- during the brief window when a new user has no org yet.
CREATE OR REPLACE FUNCTION create_organisation(org_name TEXT, org_prefix TEXT DEFAULT 'KBB')
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organisations (name, job_prefix)
  VALUES (org_name, UPPER(TRIM(org_prefix)))
  RETURNING id INTO new_org_id;

  UPDATE profiles SET organisation_id = new_org_id WHERE id = auth.uid();

  RETURN new_org_id;
END;
$$;

-- ── 6. RLS policies — organisations ──────────────────────────
DROP POLICY IF EXISTS "org_select"  ON organisations;
DROP POLICY IF EXISTS "org_insert"  ON organisations;
DROP POLICY IF EXISTS "org_update"  ON organisations;

-- Members can see their own org
CREATE POLICY "org_select" ON organisations
  FOR SELECT TO authenticated
  USING (id = get_my_org_id());

-- Any authenticated user can create an org (needed for /setup before org exists)
CREATE POLICY "org_insert" ON organisations
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Members can update their own org
CREATE POLICY "org_update" ON organisations
  FOR UPDATE TO authenticated
  USING (id = get_my_org_id());

-- ── 7. RLS policies — profiles ───────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
-- Drop any legacy policy names that may exist
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated to read profiles" ON profiles;

-- See own profile (even before org is set) + all profiles in same org
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR organisation_id = get_my_org_id());

-- Supabase auth trigger inserts new profile on signup — allow it
CREATE POLICY "profiles_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ── 8. RLS policies — jobs ───────────────────────────────────
DROP POLICY IF EXISTS "jobs_select"  ON jobs;
DROP POLICY IF EXISTS "jobs_insert"  ON jobs;
DROP POLICY IF EXISTS "jobs_update"  ON jobs;
DROP POLICY IF EXISTS "jobs_delete"  ON jobs;
-- Drop any legacy policy names
DROP POLICY IF EXISTS "Allow authenticated to read jobs"   ON jobs;
DROP POLICY IF EXISTS "Allow authenticated to insert jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated to update jobs" ON jobs;
DROP POLICY IF EXISTS "Allow authenticated to delete jobs" ON jobs;
DROP POLICY IF EXISTS "authenticated_select" ON jobs;
DROP POLICY IF EXISTS "authenticated_insert" ON jobs;
DROP POLICY IF EXISTS "authenticated_update" ON jobs;
DROP POLICY IF EXISTS "authenticated_delete" ON jobs;

CREATE POLICY "jobs_select" ON jobs
  FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id());

CREATE POLICY "jobs_insert" ON jobs
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_my_org_id());

CREATE POLICY "jobs_update" ON jobs
  FOR UPDATE TO authenticated
  USING (organisation_id = get_my_org_id());

CREATE POLICY "jobs_delete" ON jobs
  FOR DELETE TO authenticated
  USING (organisation_id = get_my_org_id());

-- ── 9. RLS policies — enquiry_sources ────────────────────────
DROP POLICY IF EXISTS "enquiry_sources_select"  ON enquiry_sources;
DROP POLICY IF EXISTS "enquiry_sources_insert"  ON enquiry_sources;
DROP POLICY IF EXISTS "enquiry_sources_update"  ON enquiry_sources;
DROP POLICY IF EXISTS "enquiry_sources_delete"  ON enquiry_sources;
DROP POLICY IF EXISTS "authenticated_select" ON enquiry_sources;
DROP POLICY IF EXISTS "authenticated_insert" ON enquiry_sources;
DROP POLICY IF EXISTS "authenticated_update" ON enquiry_sources;
DROP POLICY IF EXISTS "authenticated_delete" ON enquiry_sources;

CREATE POLICY "enquiry_sources_select" ON enquiry_sources
  FOR SELECT TO authenticated
  USING (organisation_id = get_my_org_id());

CREATE POLICY "enquiry_sources_insert" ON enquiry_sources
  FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_my_org_id());

CREATE POLICY "enquiry_sources_update" ON enquiry_sources
  FOR UPDATE TO authenticated
  USING (organisation_id = get_my_org_id());

CREATE POLICY "enquiry_sources_delete" ON enquiry_sources
  FOR DELETE TO authenticated
  USING (organisation_id = get_my_org_id());

-- ── 10. RLS policies — quote_lines (scoped via parent job) ───
DROP POLICY IF EXISTS "quote_lines_select"  ON quote_lines;
DROP POLICY IF EXISTS "quote_lines_insert"  ON quote_lines;
DROP POLICY IF EXISTS "quote_lines_update"  ON quote_lines;
DROP POLICY IF EXISTS "quote_lines_delete"  ON quote_lines;
DROP POLICY IF EXISTS "authenticated_select" ON quote_lines;
DROP POLICY IF EXISTS "authenticated_insert" ON quote_lines;
DROP POLICY IF EXISTS "authenticated_update" ON quote_lines;
DROP POLICY IF EXISTS "authenticated_delete" ON quote_lines;

CREATE POLICY "quote_lines_select" ON quote_lines
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "quote_lines_insert" ON quote_lines
  FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "quote_lines_update" ON quote_lines
  FOR UPDATE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "quote_lines_delete" ON quote_lines
  FOR DELETE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

-- ── 11. Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS jobs_organisation_id_idx            ON jobs            (organisation_id);
CREATE INDEX IF NOT EXISTS profiles_organisation_id_idx        ON profiles        (organisation_id);
CREATE INDEX IF NOT EXISTS enquiry_sources_organisation_id_idx ON enquiry_sources (organisation_id);
