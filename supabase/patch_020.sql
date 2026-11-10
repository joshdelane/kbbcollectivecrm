-- patch_020: lost reasons, "exclude from sales metrics", custom marketing channels
-- Additive and safe to re-run. Existing spend rows are moved onto the new
-- channels table with the same names, so nothing on the Marketing page changes
-- for current organisations.

-- ── 1. Jobs: lost reason + exclude from sales metrics ────────────────────────
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lost_reason TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS exclude_from_metrics BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Marketing channels (per org, editable, optionally linked to a source) ─
CREATE TABLE IF NOT EXISTS marketing_channels (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  enquiry_source  TEXT,       -- name of the linked enquiry source, for cost per lead by source
  legacy_key      TEXT,       -- the old fixed channel key this row replaced, if any
  sort_order      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organisation_id, name)
);

ALTER TABLE marketing_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mc_select_own_org" ON marketing_channels;
DROP POLICY IF EXISTS "mc_insert_own_org" ON marketing_channels;
DROP POLICY IF EXISTS "mc_update_own_org" ON marketing_channels;
DROP POLICY IF EXISTS "mc_delete_own_org" ON marketing_channels;

CREATE POLICY "mc_select_own_org" ON marketing_channels
  FOR SELECT USING (organisation_id = get_my_org_id());
CREATE POLICY "mc_insert_own_org" ON marketing_channels
  FOR INSERT WITH CHECK (organisation_id = get_my_org_id());
CREATE POLICY "mc_update_own_org" ON marketing_channels
  FOR UPDATE USING (organisation_id = get_my_org_id());
CREATE POLICY "mc_delete_own_org" ON marketing_channels
  FOR DELETE USING (organisation_id = get_my_org_id());

-- Seed the five original channels for every existing organisation
INSERT INTO marketing_channels (organisation_id, name, legacy_key, sort_order)
SELECT o.id, v.name, v.key, v.ord
FROM organisations o
CROSS JOIN (VALUES
  ('Google Ads', 'google_ads', 1),
  ('SEO', 'seo', 2),
  ('Meta Ads', 'meta_ads', 3),
  ('Agency Costs', 'agency_costs', 4),
  ('Other', 'other', 99)
) AS v(name, key, ord)
ON CONFLICT (organisation_id, name) DO NOTHING;

-- New organisations get the same five channels
CREATE OR REPLACE FUNCTION seed_marketing_channels()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO marketing_channels (organisation_id, name, legacy_key, sort_order) VALUES
    (NEW.id, 'Google Ads', 'google_ads', 1),
    (NEW.id, 'SEO', 'seo', 2),
    (NEW.id, 'Meta Ads', 'meta_ads', 3),
    (NEW.id, 'Agency Costs', 'agency_costs', 4),
    (NEW.id, 'Other', 'other', 99)
  ON CONFLICT (organisation_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS organisations_seed_marketing_channels ON organisations;
CREATE TRIGGER organisations_seed_marketing_channels
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION seed_marketing_channels();

-- ── 3. Spend rows point at a channel row instead of a fixed key ──────────────
ALTER TABLE marketing_spend DROP CONSTRAINT IF EXISTS marketing_spend_channel_check;
ALTER TABLE marketing_spend ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES marketing_channels(id) ON DELETE RESTRICT;

UPDATE marketing_spend s
SET channel_id = c.id
FROM marketing_channels c
WHERE s.channel_id IS NULL
  AND c.organisation_id = s.organisation_id
  AND c.legacy_key = s.channel;

-- Check: should return 0
SELECT COUNT(*) AS spend_rows_without_channel FROM marketing_spend WHERE channel_id IS NULL;
