import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getSourceCloseRates } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import DashboardView from '@/components/dashboard/DashboardView'
import type { Job } from '@/types'

interface Props {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}

function getDateRange(range?: string, from?: string, to?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  if (from && to) {
    return { start: new Date(from), end: new Date(to), label: 'Custom' }
  }

  switch (range) {
    case 'week': {
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay())
      start.setHours(0, 0, 0, 0)
      return { start, end, label: 'This week' }
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), q * 3, 1)
      return { start, end, label: 'This quarter' }
    }
    case 'year': {
      const start = new Date(now.getFullYear(), 0, 1)
      return { start, end, label: 'This year' }
    }
    case 'all': {
      return { start: new Date(2000, 0, 1), end, label: 'All time' }
    }
    default: {
      // This month
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start, end, label: 'This month' }
    }
  }
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
    { data: qualifiedLeads },
    stageCounts,
    closeRates,
  ] = await Promise.all([
    supabase.from('jobs').select('stage'),
    supabase
      .from('jobs')
      .select('stage, qualified_at, dead_at, order_valuation, created_at')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString()),
    supabase.from('jobs').select('rough_budget, enquiry_source').eq('stage', 'qualified_leads'),
    getStageCounts(),
    getSourceCloseRates(),
  ])

  const jobs = (filteredJobs as Pick<Job, 'stage' | 'qualified_at' | 'dead_at' | 'order_valuation' | 'created_at'>[]) ?? []
  const totalJobsAllStages = allJobs?.length ?? 0

  // Conversion rate: qualified / (qualified + dead_from_enquiries)
  const qualified = jobs.filter((j) => j.qualified_at !== null).length
  const dead = jobs.filter((j) => j.dead_at !== null).length
  const conversionDenominator = qualified + dead
  const conversionRate = conversionDenominator > 0
    ? Math.round((qualified / conversionDenominator) * 100)
    : null

  // Sales agreed: sum of order_valuation for all jobs with a value
  const salesAgreed = jobs.reduce((sum, j) => sum + (j.order_valuation ?? 0), 0)

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
      <Sidebar stageCounts={stageCounts} />
      <main className="flex-1 overflow-y-auto">
        <DashboardView
          rangeLabel={rangeLabel}
          currentRange={params.range ?? 'month'}
          periodEnquiries={periodEnquiries}
          periodQualified={periodQualified}
          periodDead={periodDead}
          conversionRate={conversionRate}
          salesAgreed={salesAgreed}
          projectedPipeline={projectedPipeline}
          stageCounts={stageCounts}
          totalJobs={totalJobsAllStages}
        />
      </main>
    </div>
  )
}
