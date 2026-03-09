'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRightIcon } from 'lucide-react'
import { advanceJobStage } from '@/lib/actions'
import { STAGE_ACTIONS } from '@/types'
import type { Job, Profile } from '@/types'

interface JobCardProps {
  job: Job
  profiles: Profile[]
  onClick: () => void
}

function getInitial(profileId: string | null, profiles: Profile[]): string {
  if (!profileId) return '?'
  const name = profiles.find((p) => p.id === profileId)?.full_name ?? ''
  return name.charAt(0).toUpperCase() || '?'
}

function getProfileName(profileId: string | null, profiles: Profile[]): string {
  if (!profileId) return 'Unassigned'
  return profiles.find((p) => p.id === profileId)?.full_name ?? 'Unknown'
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function JobCard({ job, profiles, onClick }: JobCardProps) {
  const [advancing, setAdvancing] = useState(false)
  const router = useRouter()
  const action = STAGE_ACTIONS[job.stage]

  const handleAdvance = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!action || advancing) return
    setAdvancing(true)
    await advanceJobStage(job.id, job.stage)
    router.refresh()
    setAdvancing(false)
  }

  const assignedTo =
    job.stage === 'project_management'
      ? job.installer_assigned
      : job.stage === 'qualified_leads' || job.stage === 'order_processing'
        ? job.designer_assigned ?? job.assigned_to
        : job.assigned_to

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-3.5 cursor-pointer transition-all duration-150 hover:shadow-lg hover:-translate-y-0.5 group"
      style={{ backgroundColor: '#FFFFFF' }}
    >
      {/* Top row: job ID + source */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold tracking-wide" style={{ color: '#B89763' }}>
          {job.job_id}
        </span>
        {job.enquiry_source && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
          >
            {job.enquiry_source}
          </span>
        )}
      </div>

      {/* Customer name */}
      <h3 className="font-semibold text-sm mb-2 leading-snug" style={{ color: '#1D211F' }}>
        {job.customer_name}
      </h3>

      {/* Key details */}
      <div className="space-y-1 mb-3">
        {job.phone && (
          <p className="text-xs" style={{ color: '#6B7280' }}>
            {job.phone}
          </p>
        )}
        {/* Show quote total as Value for qualified leads and order processing */}
        {(job.stage === 'qualified_leads' || job.stage === 'order_processing') && job.quote_total && (
          <p className="text-xs font-medium" style={{ color: '#374151' }}>
            Value: £{Number(job.quote_total).toLocaleString('en-GB')}
          </p>
        )}
        {job.proposed_install_date && job.stage === 'order_processing' && (
          <p className="text-xs" style={{ color: '#374151' }}>
            Install: {formatDate(job.proposed_install_date)}
          </p>
        )}
        {job.signed_off_install_date && job.stage === 'project_management' && (
          <p className="text-xs" style={{ color: '#374151' }}>
            Install: {formatDate(job.signed_off_install_date)}
          </p>
        )}
        {job.deposit_amount && job.stage === 'order_processing' && (
          <p className="text-xs font-medium" style={{ color: '#059669' }}>
            Deposit: £{Number(job.deposit_amount).toLocaleString('en-GB')}
          </p>
        )}
        {job.project_signed_off && (
          <p className="text-xs font-semibold" style={{ color: '#059669' }}>
            ✓ Signed Off
          </p>
        )}
      </div>

      {/* Footer: avatar + action button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none"
            style={{ backgroundColor: '#1D211F' }}
          >
            {getInitial(assignedTo, profiles)}
          </div>
          <span className="text-xs truncate max-w-[100px]" style={{ color: '#9CA3AF' }}>
            {getProfileName(assignedTo, profiles)}
          </span>
        </div>

        {action && (
          <button
            onClick={handleAdvance}
            disabled={advancing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#B89763' }}
          >
            {advancing ? '...' : action.label}
            {!advancing && <ChevronRightIcon size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}
