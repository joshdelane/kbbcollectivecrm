-- ============================================================
-- KBB Collective CRM — Patch 014: Fix job ID generation
-- ============================================================
-- After the RLS fix (patch 013), the generate_job_id() trigger
-- could only see jobs from the inserting user's org, causing
-- duplicate key collisions when multiple orgs share a prefix.
-- Fix: run the function as postgres (SECURITY DEFINER) so it
-- always queries the full jobs table for the true MAX ID.
-- Also: use the org's own job_prefix instead of hardcoded KBB.
-- ============================================================

CREATE OR REPLACE FUNCTION generate_job_id()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part  TEXT;
  prefix     TEXT;
  next_num   INT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');

  -- Look up this org's prefix (fallback to 'KBB' if not set)
  SELECT COALESCE(UPPER(TRIM(job_prefix)), 'KBB')
  INTO prefix
  FROM organisations
  WHERE id = NEW.organisation_id;

  IF prefix IS NULL THEN
    prefix := 'KBB';
  END IF;

  -- Find the highest existing number for this prefix+year
  -- (SECURITY DEFINER means we see ALL orgs — prevents collisions)
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(job_id, '-', 3) AS INTEGER)), 0
  ) + 1
  INTO next_num
  FROM jobs
  WHERE job_id LIKE prefix || '-' || year_part || '-%';

  NEW.job_id := prefix || '-' || year_part || '-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
