import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getTodoCount } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import ExportView from '@/components/export/ExportView'

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [stageCounts, todoCount] = await Promise.all([
    getStageCounts(),
    getTodoCount(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} todoCount={todoCount} />
      <main className="flex-1 overflow-y-auto">
        <ExportView />
      </main>
    </div>
  )
}
