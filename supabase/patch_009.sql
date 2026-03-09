-- ============================================================
-- KBB Collective CRM — Patch 009: Invite codes + Auth trigger
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Add invite_code to organisations ──────────────────────
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE DEFAULT UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));

-- Backfill any orgs that don't have a code yet
UPDATE organisations
SET invite_code = UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8))
WHERE invite_code IS NULL;

ALTER TABLE organisations ALTER COLUMN invite_code SET NOT NULL;

-- ── 2. Function: join an org via invite code ─────────────────
CREATE OR REPLACE FUNCTION join_organisation(code TEXT)
RETURNS UUID
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
DECLARE
  target_org_id UUID;
BEGIN
  SELECT id INTO target_org_id
  FROM organisations
  WHERE invite_code = UPPER(TRIM(code));

  IF target_org_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  UPDATE profiles SET organisation_id = target_org_id WHERE id = auth.uid();

  RETURN target_org_id;
END;
$$;

-- ── 3. Auth trigger: auto-create profile on signup ───────────
-- This ensures every new Supabase auth user gets a profiles row
-- automatically, populated from the signup metadata.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'company_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate the trigger cleanly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ── 4. Expose invite_code in the organisations RLS policy ────
-- org members can read their org's invite_code (already covered
-- by the existing org_select policy from patch_008)
-- Nothing extra needed here.
