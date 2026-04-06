import { createClient } from '@/lib/supabase/server'
import type { Stage } from '@/types'

// Returns total marketing spend (sum of amount) for records whose spend_month
// falls within the given date range.
export async function getMarketingSpendTotal(start: Date, end: Date): Promise<number> {
  const supabase = await createClient()
  const startStr = start.toISOString().split('T')[0]
  const endStr = end.toISOString().split('T')[0]
  const { data } = await supabase
    .from('marketing_spend')
    .select('amount')
    .gte('spend_month', startStr)
    .lte('spend_month', endStr)
  return (data ?? []).reduce((sum, row) => sum + (Number(row.amount) ?? 0), 0)
}

// Returns the average gross margin % across all project_management-stage jobs
// that have both revenue (retail_price) and cost (cost_price) data in their
// latest quote revision. Returns null when no data exists.
export async function getGrossMarginData(): Promise<{ grossMarginPct: number | null; jobCount: number }> {
  const supabase = await createClient()

  const { data: pmJobs } = await supabase
    .from('jobs')
    .select('id, quote_revision')
    .eq('stage', 'project_management')
    .is('deleted_at', null)

  if (!pmJobs || pmJobs.length === 0) return { grossMarginPct: null, jobCount: 0 }

  const jobIds = pmJobs.map((j) => j.id)
  const revisionMap = new Map(pmJobs.map((j) => [j.id, j.quote_revision ?? 1]))

  const { data: lines } = await supabase
    .from('quote_lines')
    .select('job_id, retail_price, cost_price, discount_percent, revision_number')
    .in('job_id', jobIds)

  if (!lines) return { grossMarginPct: null, jobCount: 0 }

  // Aggregate revenue and cost per job, only for the latest revision
  const jobTotals = new Map<string, { revenue: number; cost: number }>()
  for (const line of lines) {
    if (line.revision_number !== revisionMap.get(line.job_id)) continue
    if (!jobTotals.has(line.job_id)) jobTotals.set(line.job_id, { revenue: 0, cost: 0 })
    const entry = jobTotals.get(line.job_id)!
    const retail = Number(line.retail_price ?? 0)
    const disc = Number(line.discount_percent ?? 0)
    entry.revenue += retail * (1 - disc / 100)
    entry.cost += Number(line.cost_price ?? 0)
  }

  const margins: number[] = []
  for (const { revenue, cost } of jobTotals.values()) {
    if (revenue > 0 && cost > 0) {
      margins.push(((revenue - cost) / revenue) * 100)
    }
  }

  if (margins.length === 0) return { grossMarginPct: null, jobCount: 0 }

  const avg = margins.reduce((a, b) => a + b, 0) / margins.length
  return { grossMarginPct: Math.round(avg * 10) / 10, jobCount: margins.length }
}

export async function getStageCounts(): Promise<Record<Stage, number>> {
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('stage').is('deleted_at', null)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.stage] = (counts[row.stage] ?? 0) + 1
  }
  return counts as Record<Stage, number>
}

// Returns close rate (0–1) per enquiry source, based on historical sold vs dead jobs.
// A job "resolves" when it gets sold (sold_at) or dies (dead_at).
export async function getSourceCloseRates(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('enquiry_source, sold_at, dead_at')
    .or('sold_at.not.is.null,dead_at.not.is.null')
    .is('deleted_at', null)

  const counts: Record<string, { sold: number; total: number }> = {}
  for (const row of data ?? []) {
    const source = row.enquiry_source ?? '__unknown__'
    if (!counts[source]) counts[source] = { sold: 0, total: 0 }
    counts[source].total++
    if (row.sold_at) counts[source].sold++
  }

  const rates: Record<string, number> = {}
  for (const [source, { sold, total }] of Object.entries(counts)) {
    rates[source] = total > 0 ? sold / total : 0
  }
  return rates
}
