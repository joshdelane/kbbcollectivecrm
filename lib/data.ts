import { createClient } from '@/lib/supabase/server'
import { jobMarginTotals } from '@/lib/margin'
import type { BoardKey, DesignerStats, SnagItem } from '@/types'

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

// Average gross margin % across won jobs (Project Management or Finished)
// sold within the range — falling back to the enquiry date for jobs with no
// sold date, e.g. imported history. Only jobs with both revenue and cost in
// their latest quote revision count. Returns null when none do.
export async function getGrossMarginData(start: Date, end: Date): Promise<{ grossMarginPct: number | null; jobCount: number }> {
  const supabase = await createClient()

  const { data: wonJobs } = await supabase
    .from('jobs')
    .select('id, quote_revision, sold_at, created_at')
    .or('stage.eq.project_management,signed_off_at.not.is.null')
    .is('deleted_at', null)

  const inRange = (wonJobs ?? []).filter((j) => {
    const d = new Date(j.sold_at ?? j.created_at)
    return d >= start && d <= end
  })
  if (inRange.length === 0) return { grossMarginPct: null, jobCount: 0 }

  const jobIds = inRange.map((j) => j.id)
  const revisionMap = new Map(inRange.map((j) => [j.id, j.quote_revision ?? 1]))

  const [{ data: lines }, { data: extraCosts }] = await Promise.all([
    supabase
      .from('quote_lines')
      .select('job_id, category, retail_price, cost_price, discount_percent, revision_number')
      .in('job_id', jobIds),
    supabase
      .from('extra_costs')
      .select('job_id, amount')
      .in('job_id', jobIds),
  ])

  const margins: number[] = []
  for (const { revenue, cost } of jobMarginTotals(lines ?? [], extraCosts ?? [], revisionMap).values()) {
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

export interface TodoJob {
  id: string
  job_id: string
  customer_name: string
  signed_off_install_date: string | null
}
export interface TodoLine {
  id: string
  job_id: string
  category: string | null
  description: string
  retail_price: number | null
  is_ordered: boolean
  revision_number: number
}

// Everything the To-Do page lists, shared with the sidebar badge so the two
// always match:
// - unordered quote lines on Project Management jobs fitting in the next 12 weeks
// - every open snag on a Project Management or Finished job, whatever its
//   install date (snags usually turn up after the install, so a date window
//   would hide exactly the ones that matter)
export async function getTodoData(): Promise<{
  jobsWithLines: { job: TodoJob; lines: TodoLine[] }[]
  jobsWithSnags: { job: TodoJob; snags: SnagItem[] }[]
  count: number
}> {
  const supabase = await createClient()

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 84)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const todayISO = new Date().toISOString().slice(0, 10)

  const [{ data: upcomingJobs }, { data: snags }] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_id, customer_name, signed_off_install_date, quote_revision')
      .eq('stage', 'project_management')
      .not('signed_off_install_date', 'is', null)
      .gte('signed_off_install_date', todayISO)
      .lte('signed_off_install_date', cutoffISO)
      .is('deleted_at', null),
    supabase
      .from('snag_items')
      .select('*, jobs!inner(id, job_id, customer_name, signed_off_install_date, stage, signed_off_at, deleted_at)')
      .eq('is_done', false)
      .is('jobs.deleted_at', null)
      .or('stage.eq.project_management,signed_off_at.not.is.null', { referencedTable: 'jobs' })
      .order('sort_order', { ascending: true }),
  ])

  const upcoming = upcomingJobs ?? []
  let lines: TodoLine[] = []
  if (upcoming.length > 0) {
    const { data } = await supabase
      .from('quote_lines')
      .select('id, job_id, category, description, retail_price, is_ordered, revision_number')
      .in('job_id', upcoming.map((j) => j.id))
      .eq('is_ordered', false)
      .order('sort_order', { ascending: true })
    lines = (data as TodoLine[]) ?? []
  }

  const jobsWithLines = upcoming.map((j) => {
    const latestRev = j.quote_revision ?? 1
    const job: TodoJob = { id: j.id, job_id: j.job_id, customer_name: j.customer_name, signed_off_install_date: j.signed_off_install_date }
    return { job, lines: lines.filter((l) => l.job_id === j.id && l.revision_number === latestRev && l.description.trim()) }
  }).filter((jl) => jl.lines.length > 0)

  type SnagRow = SnagItem & { jobs: TodoJob }
  const snagJobs = new Map<string, { job: TodoJob; snags: SnagItem[] }>()
  for (const row of (snags as SnagRow[]) ?? []) {
    const { jobs: j, ...snag } = row
    if (!snagJobs.has(j.id)) {
      snagJobs.set(j.id, { job: { id: j.id, job_id: j.job_id, customer_name: j.customer_name, signed_off_install_date: j.signed_off_install_date }, snags: [] })
    }
    snagJobs.get(j.id)!.snags.push(snag)
  }
  const jobsWithSnags = [...snagJobs.values()]

  const count = jobsWithLines.reduce((n, jl) => n + jl.lines.length, 0)
    + jobsWithSnags.reduce((n, js) => n + js.snags.length, 0)

  return { jobsWithLines, jobsWithSnags, count }
}

export async function getTodoCount(): Promise<number> {
  return (await getTodoData()).count
}

// Returns close rate (0–1) per enquiry source, based on historical sold vs dead jobs.
// A job "resolves" when it gets sold (sold_at) or dies (dead_at).
export async function getSourceCloseRates(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('enquiry_source, sold_at, dead_at')
    .or('sold_at.not.is.null,dead_at.not.is.null')
    .eq('exclude_from_metrics', false)
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
      .select('id, designer_assigned, order_valuation, quote_revision, exclude_from_metrics')
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
      .eq('exclude_from_metrics', false)
      .gte('qualified_at', startISO)
      .lte('qualified_at', endISO)
      .is('deleted_at', null),
  ])

  const designerRoster = new Set((everDesigned ?? []).map((j) => j.designer_assigned as string))

  const soldJobIds = (soldJobs ?? []).map((j) => j.id)
  const revisionMap = new Map((soldJobs ?? []).map((j) => [j.id, j.quote_revision ?? 1]))

  let lines: { job_id: string; category: string | null; retail_price: number | null; cost_price: number | null; discount_percent: number; revision_number: number }[] = []
  let extraCosts: { job_id: string; amount: number }[] = []
  if (soldJobIds.length > 0) {
    const [{ data: lineData }, { data: extraCostData }] = await Promise.all([
      supabase
        .from('quote_lines')
        .select('job_id, category, retail_price, cost_price, discount_percent, revision_number')
        .in('job_id', soldJobIds),
      supabase
        .from('extra_costs')
        .select('job_id, amount')
        .in('job_id', soldJobIds),
    ])
    lines = lineData ?? []
    extraCosts = extraCostData ?? []
  }

  const jobMargin = jobMarginTotals(lines, extraCosts, revisionMap)

  interface Agg {
    totalSales: number
    dealsWon: number
    aovSales: number
    aovDeals: number
    marginRevenue: number
    marginCost: number
    marginJobCount: number
    won: number
    lost: number
  }
  const byDesigner = new Map<string, Agg>()
  const ensure = (id: string): Agg => {
    if (!byDesigner.has(id)) {
      byDesigner.set(id, { totalSales: 0, dealsWon: 0, aovSales: 0, aovDeals: 0, marginRevenue: 0, marginCost: 0, marginJobCount: 0, won: 0, lost: 0 })
    }
    return byDesigner.get(id)!
  }

  for (const job of soldJobs ?? []) {
    const agg = ensure(job.designer_assigned as string)
    agg.totalSales += job.order_valuation ?? 0
    agg.dealsWon += 1
    // Small jobs ticked "exclude from sales metrics" still count as sales,
    // but don't drag down average order value
    if (!job.exclude_from_metrics) {
      agg.aovSales += job.order_valuation ?? 0
      agg.aovDeals += 1
    }
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
      const aov = agg && agg.aovDeals > 0 ? agg.aovSales / agg.aovDeals : null
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

export interface SourceCostRow {
  source: string // enquiry source name, or '' for spend on channels not linked to a source
  spend: number
  enquiries: number
  qualified: number
  sales: number
}

// Marketing spend and lead counts per enquiry source for the range. Spend
// reaches a source through the channels linked to it on the Marketing page.
// Jobs ticked "exclude from sales metrics" aren't counted as leads.
export async function getSourceCostPerLead(start: Date, end: Date): Promise<SourceCostRow[]> {
  const supabase = await createClient()
  const startISO = start.toISOString()
  const endISO = end.toISOString()

  const [{ data: channels }, { data: spend }, { data: enquiries }, { data: sold }] = await Promise.all([
    supabase.from('marketing_channels').select('id, enquiry_source'),
    supabase
      .from('marketing_spend')
      .select('channel_id, amount')
      .gte('spend_month', startISO.slice(0, 10))
      .lte('spend_month', endISO.slice(0, 10)),
    supabase
      .from('jobs')
      .select('enquiry_source, qualified_at')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .eq('exclude_from_metrics', false)
      .is('deleted_at', null),
    supabase
      .from('jobs')
      .select('enquiry_source')
      .gte('sold_at', startISO)
      .lte('sold_at', endISO)
      .eq('exclude_from_metrics', false)
      .is('deleted_at', null),
  ])

  const sourceByChannel = new Map((channels ?? []).map((c) => [c.id, c.enquiry_source ?? '']))
  const rows = new Map<string, SourceCostRow>()
  const row = (source: string) => {
    if (!rows.has(source)) rows.set(source, { source, spend: 0, enquiries: 0, qualified: 0, sales: 0 })
    return rows.get(source)!
  }

  for (const s of spend ?? []) row(sourceByChannel.get(s.channel_id) ?? '').spend += Number(s.amount ?? 0)
  for (const j of enquiries ?? []) {
    if (!j.enquiry_source) continue
    const r = row(j.enquiry_source)
    r.enquiries += 1
    if (j.qualified_at) r.qualified += 1
  }
  for (const j of sold ?? []) {
    if (j.enquiry_source) row(j.enquiry_source).sales += 1
  }

  // Sources with spend first (biggest first), unlinked spend last
  return [...rows.values()]
    .filter((r) => r.spend > 0 || r.enquiries > 0)
    .sort((a, b) => (a.source === '' ? 1 : b.source === '' ? -1 : b.spend - a.spend || b.enquiries - a.enquiries))
}

// Lost reasons for leads lost in the range: dead enquiries by dead_at, and
// archived qualified leads (which have no dead_at) by when they were archived.
export async function getLostReasons(start: Date, end: Date): Promise<{ reason: string; count: number }[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('lost_reason, dead_at, updated_at')
    .eq('stage', 'archived')
    .is('signed_off_at', null)
    .is('deleted_at', null)

  const counts = new Map<string, number>()
  for (const j of data ?? []) {
    const d = new Date(j.dead_at ?? j.updated_at)
    if (d < start || d > end) continue
    const reason = j.lost_reason ?? 'No reason given'
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }
  return [...counts.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count)
}
