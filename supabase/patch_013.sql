-- ============================================================
-- KBB Collective CRM — Patch 013: Fix RLS data leak
-- ============================================================
-- The original schema.sql created broad policies (USING true)
-- that allowed any authenticated user to see ALL data across
-- ALL organisations. Patch 008 added org-scoped policies but
-- did NOT drop the old broad ones (wrong policy names).
-- PostgreSQL ORs policies together, so the broad ones won.
-- This patch removes the old policies to enforce org isolation.
-- ============================================================

-- ── jobs ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can select jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can insert jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated users can update jobs" ON jobs;

-- ── profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read profiles"  ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile"           ON profiles;
DROP POLICY IF EXISTS "Users can update own profile"           ON profiles;

-- ── enquiry_sources ───────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can read sources"   ON enquiry_sources;
DROP POLICY IF EXISTS "Authenticated users can insert sources" ON enquiry_sources;

-- ── Verify org-scoped policies from patch_008 are in place ───
-- These should already exist; CREATE IF NOT EXISTS equivalent:
DO $$
BEGIN
  -- jobs
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_select'
  ) THEN
    EXECUTE 'CREATE POLICY "jobs_select" ON jobs FOR SELECT TO authenticated USING (organisation_id = get_my_org_id())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_insert'
  ) THEN
    EXECUTE 'CREATE POLICY "jobs_insert" ON jobs FOR INSERT TO authenticated WITH CHECK (organisation_id = get_my_org_id())';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'jobs' AND policyname = 'jobs_update'
  ) THEN
    EXECUTE 'CREATE POLICY "jobs_update" ON jobs FOR UPDATE TO authenticated USING (organisation_id = get_my_org_id())';
  END IF;

  -- profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select'
  ) THEN
    EXECUTE 'CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR organisation_id = get_my_org_id())';
  END IF;

  -- enquiry_sources
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'enquiry_sources' AND policyname = 'enquiry_sources_select'
  ) THEN
    EXECUTE 'CREATE POLICY "enquiry_sources_select" ON enquiry_sources FOR SELECT TO authenticated USING (organisation_id = get_my_org_id())';
  END IF;
END $$;
