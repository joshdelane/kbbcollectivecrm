import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getTodoData } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import TodoView from '@/components/todo/TodoView'

export default async function TodoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ jobsWithLines, jobsWithSnags, count }, stageCounts] = await Promise.all([
    getTodoData(),
    getStageCounts(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} todoCount={count} />
      <main className="flex-1 overflow-y-auto">
        <TodoView jobsWithLines={jobsWithLines} jobsWithSnags={jobsWithSnags} />
      </main>
    </div>
  )
}
