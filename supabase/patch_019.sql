-- ============================================================
-- KBB Collective CRM — Patch 019: Fix quote_lines data leak
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
-- Same bug as patch 013, but for quote_lines: patch 004 created
-- broad policies (USING true) and patch 008 added org-scoped ones
-- without dropping them. PostgreSQL ORs policies together, so any
-- logged-in user can still read/edit/delete EVERY company's quote
-- lines (retail, cost, margin). Must be run before the CRM is
-- given away free.
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can select quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can insert quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can update quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can delete quote_lines" ON quote_lines;

-- ── Make sure the org-scoped policies from patch_008 are in place ──
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_lines' AND policyname = 'quote_lines_select') THEN
    EXECUTE 'CREATE POLICY "quote_lines_select" ON quote_lines FOR SELECT TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_lines' AND policyname = 'quote_lines_insert') THEN
    EXECUTE 'CREATE POLICY "quote_lines_insert" ON quote_lines FOR INSERT TO authenticated WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_lines' AND policyname = 'quote_lines_update') THEN
    EXECUTE 'CREATE POLICY "quote_lines_update" ON quote_lines FOR UPDATE TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()))';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_lines' AND policyname = 'quote_lines_delete') THEN
    EXECUTE 'CREATE POLICY "quote_lines_delete" ON quote_lines FOR DELETE TO authenticated USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()))';
  END IF;
END $$;

-- ── Check: every table should now list only org-scoped policies ──
-- Any row below with qual = 'true' is still a leak.
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
