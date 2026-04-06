import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import MarketingView from '@/components/marketing/MarketingView'
import type { MarketingSpend } from '@/types'

export default async function MarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: spendRows }, stageCounts] = await Promise.all([
    supabase
      .from('marketing_spend')
      .select('*')
      .order('spend_month', { ascending: false }),
    getStageCounts(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} />
      <main className="flex-1 overflow-y-auto">
        <MarketingView initialSpend={(spendRows as MarketingSpend[]) ?? []} />
      </main>
    </div>
  )
}
