import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStageCounts } from '@/lib/data'
import Sidebar from '@/components/layout/Sidebar'
import { UsersIcon } from 'lucide-react'
import type { Profile, Job } from '@/types'

export default async function TeamPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profiles }, { data: jobs }, { data: org }, stageCounts] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('jobs').select('assigned_to, designer_assigned, installer_assigned, stage'),
    supabase.from('organisations').select('name, invite_code').single(),
    getStageCounts(),
  ])

  const allProfiles = (profiles as Profile[]) ?? []
  const allJobs = (jobs as Pick<Job, 'assigned_to' | 'designer_assigned' | 'installer_assigned' | 'stage'>[]) ?? []

  function countActiveJobs(profileId: string) {
    return allJobs.filter(
      (j) =>
        j.stage !== 'archived' &&
        (j.assigned_to === profileId ||
          j.designer_assigned === profileId ||
          j.installer_assigned === profileId)
    ).length
  }

  function getInitial(name: string) {
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: '#1D211F' }}>
      <Sidebar stageCounts={stageCounts} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header
          className="flex-none flex items-center justify-between px-8 py-5"
          style={{ borderBottom: '1px solid #252B28' }}
        >
          <div className="flex items-center gap-2">
            <UsersIcon size={18} style={{ color: '#B89763' }} />
            <h1 className="text-xl font-bold text-white">{org?.name ?? 'Team'}</h1>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full ml-1"
              style={{ backgroundColor: '#252B28', color: '#9CA3AF' }}
            >
              {allProfiles.length} member{allProfiles.length !== 1 ? 's' : ''}
            </span>
          </div>
          {org?.invite_code && (
            <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: '#1E2422', border: '1px solid #2A2F2D' }}>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>Invite code</p>
                <p className="text-sm font-mono font-bold tracking-widest text-white">{org.invite_code}</p>
              </div>
              <p className="text-xs" style={{ color: '#4A5250' }}>Share with new team members so they can join at the sign-up page</p>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            All team members with an account. New members sign up via the login page.
          </p>

          <div className="space-y-3 max-w-3xl">
            {allProfiles.length === 0 ? (
              <div className="text-center py-16" style={{ color: '#4A5250' }}>
                No team members yet.
              </div>
            ) : (
              allProfiles.map((profile) => {
                const activeJobs = countActiveJobs(profile.id)
                return (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 rounded-xl px-5 py-4"
                    style={{ backgroundColor: '#252B28' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-none"
                      style={{ backgroundColor: '#B89763' }}
                    >
                      {getInitial(profile.full_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
                      <p className="text-xs truncate" style={{ color: '#6B7280' }}>
                        {profile.email}
                        {profile.company_name && (
                          <span style={{ color: '#B89763' }}> · {profile.company_name}</span>
                        )}
                      </p>
                    </div>

                    {/* Active jobs badge */}
                    <div className="flex-none text-right">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={
                          activeJobs > 0
                            ? { backgroundColor: '#B8976322', color: '#B89763' }
                            : { backgroundColor: '#1D211F', color: '#4A5250' }
                        }
                      >
                        {activeJobs} active job{activeJobs !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Joined */}
                    <div className="flex-none text-right hidden sm:block">
                      <p className="text-xs" style={{ color: '#4A5250' }}>
                        Joined {new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
