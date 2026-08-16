import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getSourceCloseRates } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import BoardListView from '@/components/board/BoardListView'
import type { Job, Profile, EnquirySource, BoardKey } from '@/types'

const VALID_BOARDS: BoardKey[] = [
  'enquiries',
  'qualified_leads',
  'order_processing',
  'project_management',
  'dead_leads',
  'finished',
]

interface Props {
  params: Promise<{ stage: string }>
  searchParams: Promise<{ open?: string }>
}

export default async function BoardStagePage({ params, searchParams }: Props) {
  const { stage } = await params

  // Legacy link/bookmark support: the archived board used to be a single page.
  if (stage === 'archived') redirect('/board/dead_leads')

  if (!VALID_BOARDS.includes(stage as BoardKey)) notFound()
  const board = stage as BoardKey

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { open: openJobId } = await searchParams

  let jobsQuery = supabase
    .from('jobs')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (board === 'dead_leads') {
    jobsQuery = jobsQuery.eq('stage', 'archived').is('signed_off_at', null)
  } else if (board === 'finished') {
    jobsQuery = jobsQuery.eq('stage', 'archived').not('signed_off_at', 'is', null)
  } else {
    jobsQuery = jobsQuery.eq('stage', board)
  }

  const [
    { data: jobs },
    { data: profiles },
    { data: enquirySources },
    stageCounts,
    closeRates,
  ] = await Promise.all([
    jobsQuery,
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('enquiry_sources').select('*').order('sort_order'),
    getStageCounts(),
    getSourceCloseRates(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} />
      <main className="flex-1 overflow-y-auto">
        <BoardListView
          board={board}
          initialJobs={(jobs as Job[]) ?? []}
          profiles={(profiles as Profile[]) ?? []}
          enquirySources={(enquirySources as EnquirySource[]) ?? []}
          closeRates={closeRates}
          openJobId={openJobId}
        />
      </main>
    </div>
  )
}
