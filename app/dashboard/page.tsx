import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getSourceCloseRates, getMarketingSpendTotal, getGrossMarginData, getTodoCount } from '@/lib/data'
import { getDateRange } from '@/lib/dateRange'
import Sidebar from '@/components/layout/Sidebar'
import DashboardView from '@/components/dashboard/DashboardView'
import type { Job } from '@/types'

interface Props {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { start, end, label: rangeLabel } = getDateRange(params.range, params.from, params.to)

  const [
    { data: allJobs },
    { data: filteredJobs },
    { data: soldJobs },
    { data: qualifiedLeads },
    stageCounts,
    closeRates,
    marketingSpend,
    grossMarginData,
    todoCount,
  ] = await Promise.all([
    supabase.from('jobs').select('stage').is('deleted_at', null),
    supabase
      .from('jobs')
      .select('stage, qualified_at, dead_at, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .is('deleted_at', null),
    supabase
      .from('jobs')
      .select('sold_at, order_valuation')
      .gte('sold_at', start.toISOString())
      .lte('sold_at', end.toISOString())
      .is('deleted_at', null),
    supabase.from('jobs').select('rough_budget, enquiry_source').eq('stage', 'qualified_leads').is('deleted_at', null),
    getStageCounts(),
    getSourceCloseRates(),
    getMarketingSpendTotal(start, end),
    getGrossMarginData(),
    getTodoCount(),
  ])

  const jobs = (filteredJobs as Pick<Job, 'stage' | 'qualified_at' | 'dead_at' | 'created_at'>[]) ?? []
  const sales = (soldJobs as Pick<Job, 'sold_at' | 'order_valuation'>[]) ?? []
  const totalJobsAllStages = allJobs?.length ?? 0

  // Conversion rate: qualified / (qualified + dead) for enquiries created in period
  const qualified = jobs.filter((j) => j.qualified_at !== null).length
  const dead = jobs.filter((j) => j.dead_at !== null).length
  const conversionDenominator = qualified + dead
  const conversionRate = conversionDenominator > 0
    ? Math.round((qualified / conversionDenominator) * 100)
    : null

  // Sales agreed: sum of order_valuation for jobs marked sold in period
  const salesAgreed = sales.reduce((sum, j) => sum + (j.order_valuation ?? 0), 0)

  // Sold count: jobs with a non-zero order_valuation sold in period (used for AOV)
  const soldCount = sales.filter((j) => j.order_valuation !== null && j.order_valuation > 0).length

  // AOV: average order value = total sales / number of sales
  const aov = soldCount > 0 ? Math.round(salesAgreed / soldCount) : null

  // CPL: cost per qualified lead = total marketing spend / qualified leads in period
  const cpl = marketingSpend > 0 && qualified > 0
    ? Math.round(marketingSpend / qualified)
    : null

  // CPA: cost per acquisition = total marketing spend / sales in period
  const cpa = marketingSpend > 0 && soldCount > 0
    ? Math.round(marketingSpend / soldCount)
    : null

  // CVR: sales closed in period / enquiries qualified in period
  const cvrSalesCount = sales.length
  const cvr = qualified > 0 ? Math.round((cvrSalesCount / qualified) * 100) : null

  // Projected pipeline: sum of rough_budget × close_rate for all current qualified leads
  const projectedPipeline = (qualifiedLeads ?? []).reduce((sum, j) => {
    const rate = j.enquiry_source ? (closeRates[j.enquiry_source] ?? 0) : 0
    return sum + (j.rough_budget ?? 0) * rate
  }, 0)

  // Period stats
  const periodEnquiries = jobs.length
  const periodQualified = qualified
  const periodDead = dead

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} todoCount={todoCount} />
      <main className="flex-1 overflow-y-auto">
        <DashboardView
          rangeLabel={rangeLabel}
          currentRange={params.range ?? 'month'}
          currentFrom={params.from}
          currentTo={params.to}
          periodEnquiries={periodEnquiries}
          periodQualified={periodQualified}
          periodDead={periodDead}
          conversionRate={conversionRate}
          salesAgreed={salesAgreed}
          aov={aov}
          cpl={cpl}
          cpa={cpa}
          cvr={cvr}
          cvrSalesCount={cvrSalesCount}
          grossMarginPct={grossMarginData.grossMarginPct}
          grossMarginJobCount={grossMarginData.jobCount}
          projectedPipeline={projectedPipeline}
          stageCounts={stageCounts}
          totalJobs={totalJobsAllStages}
          hasMarketingSpend={marketingSpend > 0}
        />
      </main>
    </div>
  )
}
