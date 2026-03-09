'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGES } from '@/types'
import type { Job, Profile, Stage, EnquirySource } from '@/types'
import StageColumn from './StageColumn'
import JobDetailPanel from '@/components/jobs/JobDetailPanel'
import NewJobModal from '@/components/jobs/NewJobModal'
import { PlusIcon, LogOutIcon, UsersIcon } from 'lucide-react'
import Link from 'next/link'

interface BoardViewProps {
  initialJobs: Job[]
  profiles: Profile[]
  enquirySources: EnquirySource[]
  currentUserEmail: string
}

export default function BoardView({ initialJobs, profiles, enquirySources, currentUserEmail }: BoardViewProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [sources, setSources] = useState<EnquirySource[]>(enquirySources)
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const jobsByStage = STAGES.reduce(
    (acc, stage) => {
      acc[stage.key] = initialJobs.filter((job) => job.stage === stage.key)
      return acc
    },
    {} as Record<Stage, Job[]>
  )

  const totalActive = initialJobs.filter((j) => j.stage !== 'archived').length

  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#1D211F' }}>
      {/* Header */}
      <header
        className="flex-none flex items-center justify-between px-6 py-4 z-10"
        style={{ backgroundColor: '#161A18', borderBottom: '1px solid #2A2F2D' }}
      >
        <div className="flex items-center gap-4">
          <div>
            <span className="text-lg font-bold text-white tracking-tight">KBB Collective</span>
            <span className="ml-2 text-sm font-semibold" style={{ color: '#B89763' }}>CRM</span>
          </div>
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ backgroundColor: '#252B28', color: '#9CA3AF' }}
          >
            {totalActive} active job{totalActive !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/team"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: '#9CA3AF' }}
          >
            <UsersIcon size={15} />
            <span className="hidden sm:inline">Team</span>
          </Link>

          <span className="text-xs hidden sm:block ml-2" style={{ color: '#4A5250' }}>
            {currentUserEmail}
          </span>

          <button
            onClick={() => setIsNewJobOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 ml-2"
            style={{ backgroundColor: '#B89763' }}
          >
            <PlusIcon size={15} />
            New Enquiry
          </button>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-lg transition-colors hover:bg-white/5"
            title="Sign out"
          >
            <LogOutIcon size={16} style={{ color: '#6B7280' }} />
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 flex gap-4 p-6 overflow-x-auto">
        {STAGES.map((stage) => (
          <StageColumn
            key={stage.key}
            stage={stage}
            jobs={jobsByStage[stage.key] ?? []}
            profiles={profiles}
            onJobClick={setSelectedJob}
          />
        ))}
      </div>

      {/* Job detail side panel */}
      {selectedJob && (
        <JobDetailPanel
          job={selectedJob}
          profiles={profiles}
          enquirySources={sources}
          onSourceAdded={(s) => setSources((prev) => [...prev, s])}
          onClose={() => setSelectedJob(null)}
          onJobUpdated={() => { setSelectedJob(null); router.refresh() }}
        />
      )}

      {/* New enquiry modal */}
      {isNewJobOpen && (
        <NewJobModal
          profiles={profiles}
          enquirySources={sources}
          onSourceAdded={(s) => setSources((prev) => [...prev, s])}
          onClose={() => setIsNewJobOpen(false)}
          onCreated={() => { setIsNewJobOpen(false); router.refresh() }}
        />
      )}
    </div>
  )
}
