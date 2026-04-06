-- patch_015: Add marketing_spend table for CPL/CPA tracking
-- Safe, additive migration — does not modify any existing tables or data.

CREATE TABLE IF NOT EXISTS marketing_spend (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  channel         TEXT        NOT NULL CHECK (channel IN ('google_ads', 'seo', 'meta_ads', 'agency_costs', 'other')),
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  spend_month     DATE        NOT NULL, -- stored as first day of the month, e.g. 2024-04-01
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — scoped to the user's organisation (same pattern as all other tables)
ALTER TABLE marketing_spend ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ms_select_own_org" ON marketing_spend
  FOR SELECT USING (organisation_id = get_my_org_id());

CREATE POLICY "ms_insert_own_org" ON marketing_spend
  FOR INSERT WITH CHECK (organisation_id = get_my_org_id());

CREATE POLICY "ms_update_own_org" ON marketing_spend
  FOR UPDATE USING (organisation_id = get_my_org_id());

CREATE POLICY "ms_delete_own_org" ON marketing_spend
  FOR DELETE USING (organisation_id = get_my_org_id());
