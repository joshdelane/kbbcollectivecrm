import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts, getTodoCount } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import MarketingView from '@/components/marketing/MarketingView'
import type { MarketingSpend, MarketingChannel, EnquirySource } from '@/types'

export default async function MarketingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: spendRows }, { data: channels }, { data: sources }, stageCounts, todoCount] = await Promise.all([
    supabase
      .from('marketing_spend')
      .select('*')
      .order('spend_month', { ascending: false }),
    supabase.from('marketing_channels').select('*').order('sort_order').order('name'),
    supabase.from('enquiry_sources').select('*').order('sort_order').order('name'),
    getStageCounts(),
    getTodoCount(),
  ])

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} todoCount={todoCount} />
      <main className="flex-1 overflow-y-auto">
        <MarketingView
          initialSpend={(spendRows as MarketingSpend[]) ?? []}
          channels={(channels as MarketingChannel[]) ?? []}
          enquirySources={(sources as EnquirySource[]) ?? []}
        />
      </main>
    </div>
  )
}
