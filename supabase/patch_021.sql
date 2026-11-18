-- patch_021: tasks on live jobs (items to order, calls to make, anything else)
-- Additive and safe to re-run. Open tasks also show on the To-Do page.

CREATE TABLE IF NOT EXISTS job_tasks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id      UUID        REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  due_date    DATE,
  assigned_to UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  is_done     BOOLEAN     NOT NULL DEFAULT FALSE,
  done_at     TIMESTAMPTZ,
  sort_order  INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_tasks_select" ON job_tasks;
DROP POLICY IF EXISTS "job_tasks_insert" ON job_tasks;
DROP POLICY IF EXISTS "job_tasks_update" ON job_tasks;
DROP POLICY IF EXISTS "job_tasks_delete" ON job_tasks;

-- Scoped via the parent job's organisation, same pattern as snag_items
CREATE POLICY "job_tasks_select" ON job_tasks
  FOR SELECT TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "job_tasks_insert" ON job_tasks
  FOR INSERT TO authenticated
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "job_tasks_update" ON job_tasks
  FOR UPDATE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()))
  WITH CHECK (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE POLICY "job_tasks_delete" ON job_tasks
  FOR DELETE TO authenticated
  USING (job_id IN (SELECT id FROM jobs WHERE organisation_id = get_my_org_id()));

CREATE INDEX IF NOT EXISTS job_tasks_job_id_idx ON job_tasks (job_id);

-- Check: should return 0 rows and no error
SELECT COUNT(*) AS job_tasks FROM job_tasks;
