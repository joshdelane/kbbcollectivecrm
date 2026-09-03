import { createClient } from '@/lib/supabase/server'
import type { BoardKey, DesignerStats } from '@/types'

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

export async function getStageCounts(): Promise<Record<BoardKey, number>> {
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('stage, signed_off_at').is('deleted_at', null)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const key = row.stage === 'archived' ? (row.signed_off_at ? 'finished' : 'dead_leads') : row.stage
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts as Record<BoardKey, number>
}

// Counts outstanding to-do items — unordered quote lines and open snag
// checklist items — for jobs in project_management with an install date in
// the next 12 weeks. Mirrors the query in app/todo/page.tsx so the sidebar
// badge always matches what the To-Do page actually lists.
export async function getTodoCount(): Promise<number> {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 84)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const todayISO = new Date().toISOString().slice(0, 10)

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, quote_revision')
    .eq('stage', 'project_management')
    .not('signed_off_install_date', 'is', null)
    .gte('signed_off_install_date', todayISO)
    .lte('signed_off_install_date', cutoffISO)

  if (!jobs || jobs.length === 0) return 0
  const jobIds = jobs.map((j) => j.id)
  const revMap = new Map(jobs.map((j) => [j.id, j.quote_revision ?? 1]))

  const [{ data: lines }, { count: snagCount }] = await Promise.all([
    supabase
      .from('quote_lines')
      .select('job_id, description, revision_number')
      .in('job_id', jobIds)
      .eq('is_ordered', false),
    supabase
      .from('snag_items')
      .select('id', { count: 'exact', head: true })
      .in('job_id', jobIds)
      .eq('is_done', false),
  ])

  const outstandingLines = (lines ?? []).filter(
    (l) => l.revision_number === revMap.get(l.job_id) && l.description.trim()
  ).length

  return outstandingLines + (snagCount ?? 0)
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

// Per-designer stats for the Leaderboard, for a given date range.
// Roster is every profile that has ever been a "designer_assigned" on a job
// (stable across ranges — a designer with no activity in a period shows £0
// rather than disappearing, so periods stay comparable).
// - Sales / deals won / AOV / margin: jobs sold (sold_at) within the range.
// - Conversion rate: of jobs they were assigned as designer that were
//   qualified (qualified_at) within the range, % that have since sold vs.
//   ended up in the Dead Leads bucket (archived, no signed_off_at) — leads
//   still in flight aren't counted either way, matching how close rates are
//   computed elsewhere in the app.
export async function getDesignerLeaderboard(start: Date, end: Date): Promise<DesignerStats[]> {
  const supabase = await createClient()
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  const [{ data: profiles }, { data: everDesigned }, { data: soldJobs }, { data: conversionJobs }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').order('full_name'),
    supabase.from('jobs').select('designer_assigned').not('designer_assigned', 'is', null),
    supabase
      .from('jobs')
      .select('id, designer_assigned, order_valuation, quote_revision')
      .not('designer_assigned', 'is', null)
      .not('sold_at', 'is', null)
      .gte('sold_at', startISO)
      .lte('sold_at', endISO)
      .is('deleted_at', null),
    supabase
      .from('jobs')
      .select('designer_assigned, sold_at, stage, signed_off_at')
      .not('designer_assigned', 'is', null)
      .not('qualified_at', 'is', null)
      .gte('qualified_at', startISO)
      .lte('qualified_at', endISO)
      .is('deleted_at', null),
  ])

  const designerRoster = new Set((everDesigned ?? []).map((j) => j.designer_assigned as string))

  const soldJobIds = (soldJobs ?? []).map((j) => j.id)
  const revisionMap = new Map((soldJobs ?? []).map((j) => [j.id, j.quote_revision ?? 1]))

  let lines: { job_id: string; retail_price: number | null; cost_price: number | null; discount_percent: number; revision_number: number }[] = []
  if (soldJobIds.length > 0) {
    const { data } = await supabase
      .from('quote_lines')
      .select('job_id, retail_price, cost_price, discount_percent, revision_number')
      .in('job_id', soldJobIds)
    lines = data ?? []
  }

  const jobMargin = new Map<string, { revenue: number; cost: number }>()
  for (const line of lines) {
    if (line.revision_number !== revisionMap.get(line.job_id)) continue
    if (!jobMargin.has(line.job_id)) jobMargin.set(line.job_id, { revenue: 0, cost: 0 })
    const entry = jobMargin.get(line.job_id)!
    const retail = Number(line.retail_price ?? 0)
    const disc = Number(line.discount_percent ?? 0)
    entry.revenue += retail * (1 - disc / 100)
    entry.cost += Number(line.cost_price ?? 0)
  }

  interface Agg {
    totalSales: number
    dealsWon: number
    marginRevenue: number
    marginCost: number
    marginJobCount: number
    won: number
    lost: number
  }
  const byDesigner = new Map<string, Agg>()
  const ensure = (id: string): Agg => {
    if (!byDesigner.has(id)) {
      byDesigner.set(id, { totalSales: 0, dealsWon: 0, marginRevenue: 0, marginCost: 0, marginJobCount: 0, won: 0, lost: 0 })
    }
    return byDesigner.get(id)!
  }

  for (const job of soldJobs ?? []) {
    const agg = ensure(job.designer_assigned as string)
    agg.totalSales += job.order_valuation ?? 0
    agg.dealsWon += 1
    const m = jobMargin.get(job.id)
    if (m && m.revenue > 0 && m.cost > 0) {
      agg.marginRevenue += m.revenue
      agg.marginCost += m.cost
      agg.marginJobCount += 1
    }
  }

  for (const job of conversionJobs ?? []) {
    const agg = ensure(job.designer_assigned as string)
    if (job.sold_at) agg.won += 1
    else if (job.stage === 'archived' && !job.signed_off_at) agg.lost += 1
    // else: still in flight (enquiries/qualified/order_processing/project_management) — not counted yet
  }

  const results: DesignerStats[] = (profiles ?? [])
    .filter((p) => designerRoster.has(p.id))
    .map((p) => {
      const agg = byDesigner.get(p.id)
      const totalSales = agg?.totalSales ?? 0
      const dealsWon = agg?.dealsWon ?? 0
      const aov = dealsWon > 0 ? totalSales / dealsWon : null
      const grossMarginTotal = agg && agg.marginJobCount > 0 ? agg.marginRevenue - agg.marginCost : null
      const grossMarginPct = agg && agg.marginRevenue > 0 && agg.marginJobCount > 0
        ? ((agg.marginRevenue - agg.marginCost) / agg.marginRevenue) * 100
        : null
      const won = agg?.won ?? 0
      const lost = agg?.lost ?? 0
      const conversionRate = won + lost > 0 ? (won / (won + lost)) * 100 : null
      return {
        profileId: p.id,
        fullName: p.full_name,
        totalSales,
        dealsWon,
        aov,
        grossMarginTotal,
        grossMarginPct,
        wonCount: won,
        lostCount: lost,
        conversionRate,
      }
    })

  results.sort((a, b) => b.totalSales - a.totalSales)
  return results
}
