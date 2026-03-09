import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getSourceCloseRates } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import BoardListView from '@/components/board/BoardListView'
import type { Job, Profile, EnquirySource, Stage } from '@/types'

const VALID_STAGES: Stage[] = [
  'enquiries',
  'qualified_leads',
  'order_processing',
  'project_management',
  'archived',
]

interface Props {
  params: Promise<{ stage: string }>
}

export default async function BoardStagePage({ params }: Props) {
  const { stage } = await params

  if (!VALID_STAGES.includes(stage as Stage)) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: jobs },
    { data: profiles },
    { data: enquirySources },
    stageCounts,
    closeRates,
  ] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('stage', stage)
      .order('created_at', { ascending: false }),
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
          stage={stage as Stage}
          initialJobs={(jobs as Job[]) ?? []}
          profiles={(profiles as Profile[]) ?? []}
          enquirySources={(enquirySources as EnquirySource[]) ?? []}
          closeRates={closeRates}
        />
      </main>
    </div>
  )
}
