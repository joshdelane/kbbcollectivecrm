import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getTodoCount, getDesignerLeaderboard } from '@/lib/data'
import { getDateRange } from '@/lib/dateRange'
import Sidebar from '@/components/layout/Sidebar'
import LeaderboardView from '@/components/leaderboard/LeaderboardView'

interface Props {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>
}

export default async function LeaderboardPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { start, end, label: rangeLabel } = getDateRange(params.range, params.from, params.to)

  const [designers, stageCounts, todoCount] = await Promise.all([
    getDesignerLeaderboard(start, end),
    getStageCounts(),
    getTodoCount(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} todoCount={todoCount} />
      <main className="flex-1 overflow-y-auto">
        <LeaderboardView
          designers={designers}
          rangeLabel={rangeLabel}
          currentRange={params.range ?? 'month'}
          currentFrom={params.from}
          currentTo={params.to}
        />
      </main>
    </div>
  )
}
