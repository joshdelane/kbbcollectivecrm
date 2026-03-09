-- ============================================================
-- KBB Collective CRM — Patch 004
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Quote lines: one row per line item on a job's quote
CREATE TABLE IF NOT EXISTS quote_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  retail_price NUMERIC(12, 2),
  cost_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can select quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can insert quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can update quote_lines" ON quote_lines;
DROP POLICY IF EXISTS "Authenticated users can delete quote_lines" ON quote_lines;

CREATE POLICY "Authenticated users can select quote_lines"
  ON quote_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert quote_lines"
  ON quote_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update quote_lines"
  ON quote_lines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete quote_lines"
  ON quote_lines FOR DELETE TO authenticated USING (true);
