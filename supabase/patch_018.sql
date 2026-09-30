-- ============================================================
-- KBB Collective CRM — Patch 018
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. Fix enquiry_sources uniqueness — was global, needs to be per-org ──────
-- The original schema made `name` UNIQUE across the whole table. Multi-tenancy
-- (patch_008) never updated this, so a name claimed by any one organisation
-- (e.g. the seeded "Referral") permanently blocks every other organisation
-- from ever using it — even though RLS hides that other org's row from view.
ALTER TABLE enquiry_sources DROP CONSTRAINT IF EXISTS enquiry_sources_name_key;
ALTER TABLE enquiry_sources ADD CONSTRAINT enquiry_sources_org_name_key UNIQUE (organisation_id, name);

-- ── 2. Delivery date on orders — when the order is due in ────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS order_delivery_date DATE;

-- ── 3. Extra costs: unforeseen costs during a job, hidden from clients ───────
-- Reduces margin but is never shown in a printed quote or proof of purchase —
-- kept as its own table, separate from quote_lines (which represent what the
-- client was quoted, not what the business absorbed afterwards).
CREATE TABLE IF NOT EXISTS extra_costs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE extra_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "extra_costs_select" ON extra_costs;
DROP POLICY IF EXISTS "extra_costs_insert" ON extra_costs;
DROP POLICY IF EXISTS "extra_costs_update" ON extra_costs;
DROP POLICY IF EXISTS "extra_costs_delete" ON extra_costs;

CREATE POLICY "extra_costs_select" ON extra_costs
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "extra_costs_insert" ON extra_costs
  FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "extra_costs_update" ON extra_costs
  FOR UPDATE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "extra_costs_delete" ON extra_costs
  FOR DELETE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE INDEX IF NOT EXISTS extra_costs_job_id_idx ON extra_costs (job_id);
