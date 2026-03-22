-- ============================================================
-- KBB Collective CRM — Patch 011: Zapier webhook secret
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Add a unique webhook secret to each organisation.
-- Auto-generates a 32-character random secret for every org.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS webhook_secret TEXT UNIQUE
    DEFAULT UPPER(REPLACE(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', ''));

-- Backfill any orgs that don't have a secret yet
UPDATE organisations
SET webhook_secret = UPPER(REPLACE(gen_random_uuid()::TEXT || gen_random_uuid()::TEXT, '-', ''))
WHERE webhook_secret IS NULL;

ALTER TABLE organisations ALTER COLUMN webhook_secret SET NOT NULL;
