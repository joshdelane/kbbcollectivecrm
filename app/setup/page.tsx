import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SetupView from '@/components/setup/SetupView'

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // If they already have an org, send them to the dashboard
  const { data: profile } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()

  if (profile?.organisation_id) redirect('/dashboard')

  return <SetupView />
}
