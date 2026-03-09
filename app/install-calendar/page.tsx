import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import InstallCalendarView from '@/components/calendar/InstallCalendarView'
import type { CalendarJob } from '@/components/calendar/InstallCalendarView'

export default async function InstallCalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: jobs }, stageCounts] = await Promise.all([
    supabase
      .from('jobs')
      .select('id, job_id, customer_name, signed_off_install_date, fitting_days, stage, worktop_template_date, worktop_install_date')
      .eq('stage', 'project_management')
      .not('signed_off_install_date', 'is', null)
      .not('fitting_days', 'is', null)
      .order('signed_off_install_date', { ascending: true }),
    getStageCounts(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} />
      <main className="flex-1 overflow-y-auto">
        <InstallCalendarView jobs={(jobs as CalendarJob[]) ?? []} />
      </main>
    </div>
  )
}
