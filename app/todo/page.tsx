import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import TodoView from '@/components/todo/TodoView'

export default async function TodoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 12 weeks from today
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() + 84)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const todayISO = new Date().toISOString().slice(0, 10)

  // Jobs in project_management with install date within 12 weeks
  const [{ data: jobs }, stageCounts] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_id, customer_name, signed_off_install_date')
      .eq('stage', 'project_management')
      .not('signed_off_install_date', 'is', null)
      .gte('signed_off_install_date', todayISO)
      .lte('signed_off_install_date', cutoffISO)
      .order('signed_off_install_date', { ascending: true }),
    getStageCounts(),
  ])

  if (!jobs || jobs.length === 0) {
    return (
      <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
        <Sidebar stageCounts={stageCounts} />
        <main className="flex-1 overflow-y-auto">
          <TodoView jobsWithLines={[]} />
        </main>
      </div>
    )
  }

  // Fetch unordered quote lines for those jobs
  const jobIds = jobs.map((j) => j.id)
  const { data: lines } = await supabase
    .from('quote_lines')
    .select('id, job_id, category, description, retail_price, is_ordered, revision_number')
    .in('job_id', jobIds)
    .eq('is_ordered', false)
    .order('sort_order', { ascending: true })

  // Attach lines to jobs, filter to latest revision only
  const { data: jobRevisions } = await supabase
    .from('jobs')
    .select('id, quote_revision')
    .in('id', jobIds)

  const revMap: Record<string, number> = {}
  jobRevisions?.forEach((j) => { revMap[j.id] = j.quote_revision ?? 1 })

  type LineRow = { id: string; job_id: string; category: string | null; description: string; retail_price: number | null; is_ordered: boolean; revision_number: number }

  const jobsWithLines = jobs.map((job) => {
    const latestRev = revMap[job.id] ?? 1
    const jobLines = (lines as LineRow[] ?? []).filter(
      (l) => l.job_id === job.id && l.revision_number === latestRev && l.description.trim()
    )
    return { job, lines: jobLines }
  }).filter((jl) => jl.lines.length > 0)

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} />
      <main className="flex-1 overflow-y-auto">
        <TodoView jobsWithLines={jobsWithLines} />
      </main>
    </div>
  )
}
