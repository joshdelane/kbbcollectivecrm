'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, ChevronRightIcon, XCircleIcon } from 'lucide-react'
import { advanceJobStage, markJobDead } from '@/lib/actions'
import { STAGE_ACTIONS } from '@/types'
import type { Job, Profile, EnquirySource, Stage } from '@/types'
import JobDetailPanel from '@/components/jobs/JobDetailPanel'
import NewJobModal from '@/components/jobs/NewJobModal'

interface BoardListViewProps {
  stage: Stage
  initialJobs: Job[]
  profiles: Profile[]
  enquirySources: EnquirySource[]
  closeRates?: Record<string, number>
}

const STAGE_COLORS: Record<Stage, string> = {
  enquiries: '#3B82F6',
  qualified_leads: '#8B5CF6',
  order_processing: '#F59E0B',
  project_management: '#10B981',
  archived: '#6B7280',
}

const STAGE_LABELS: Record<Stage, string> = {
  enquiries: 'Enquiries',
  qualified_leads: 'Qualified Leads',
  order_processing: 'Order Processing',
  project_management: 'Project Management',
  archived: 'Archived',
}

function fmt(n: number | null | undefined, prefix = '£') {
  if (!n) return '—'
  return `${prefix}${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProfileCell({ profileId, profiles }: { profileId: string | null; profiles: Profile[] }) {
  const profile = profiles.find((p) => p.id === profileId)
  if (!profile) return <span style={{ color: '#4A5250' }}>—</span>
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none"
        style={{ backgroundColor: '#B89763', fontSize: '10px' }}
      >
        {profile.full_name.charAt(0).toUpperCase()}
      </span>
      <span className="truncate max-w-[100px]">{profile.full_name}</span>
    </span>
  )
}

function ProbabilityCell({ source, closeRates }: { source: string | null; closeRates: Record<string, number> }) {
  if (!source || !(source in closeRates)) {
    return <span style={{ color: '#4A5250' }}>No data</span>
  }
  const pct = Math.round(closeRates[source] * 100)
  const color = pct >= 60 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444'
  const bg = pct >= 60 ? '#05402022' : pct >= 40 ? '#F59E0B22' : '#3B151522'
  return (
    <span className="flex items-center gap-2">
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: bg, color }}>
        {pct}%
      </span>
      <span className="text-xs" style={{ color: '#4A5250' }}>{source}</span>
    </span>
  )
}

function CheckCell({ checked }: { checked: boolean }) {
  return checked ? (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#05402022', color: '#10B981' }}>
      Yes
    </span>
  ) : (
    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#1D211F', color: '#6B7280' }}>
      No
    </span>
  )
}

function ActionCell({ job, onAdvance, onDead }: { job: Job; onAdvance: () => void; onDead?: () => void }) {
  const action = STAGE_ACTIONS[job.stage]
  return (
    <span className="flex items-center gap-2 justify-end">
      {onDead && job.stage === 'enquiries' && (
        <button
          onClick={(e) => { e.stopPropagation(); onDead() }}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#3B151522', color: '#EF4444', border: '1px solid #3B1515' }}
          title="Mark as dead"
        >
          <XCircleIcon size={11} />
          Dead
        </button>
      )}
      {action && (
        <button
          onClick={(e) => { e.stopPropagation(); onAdvance() }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#B89763' }}
        >
          {action.label}
          <ChevronRightIcon size={11} />
        </button>
      )}
    </span>
  )
}

const TH = ({ children, width }: { children?: React.ReactNode; width?: string }) => (
  <th
    className="text-left px-3 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
    style={{ color: '#6B7280', width }}
  >
    {children}
  </th>
)

const TD = ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
  <td
    className="px-3 py-3 text-sm"
    style={{ color: '#D1D5DB', borderBottom: '1px solid #252B28' }}
    onClick={onClick}
  >
    {children}
  </td>
)

export default function BoardListView({ stage, initialJobs, profiles, enquirySources, closeRates = {} }: BoardListViewProps) {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [sources, setSources] = useState<EnquirySource[]>(enquirySources)
  const [advancing, setAdvancing] = useState<string | null>(null)
  const router = useRouter()
  const color = STAGE_COLORS[stage]

  const handleAdvance = async (job: Job) => {
    if (advancing) return
    setAdvancing(job.id)
    await advanceJobStage(job.id, job.stage)
    router.refresh()
    setAdvancing(null)
  }

  const handleDead = async (job: Job) => {
    if (advancing) return
    setAdvancing(job.id)
    await markJobDead(job.id)
    router.refresh()
    setAdvancing(null)
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Page header */}
      <header
        className="flex items-center justify-between px-8 py-5 flex-none"
        style={{ borderBottom: '1px solid #252B28' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <h1 className="text-xl font-bold text-white">{STAGE_LABELS[stage]}</h1>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: color + '22', color }}
          >
            {initialJobs.length}
          </span>
        </div>
        {stage === 'enquiries' && (
          <button
            onClick={() => setIsNewJobOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#B89763' }}
          >
            <PlusIcon size={15} />
            New Enquiry
          </button>
        )}
      </header>

      {/* Table */}
      <div className="flex-1 overflow-x-auto px-8 py-6">
        {initialJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#252B28' }}>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
            </div>
            <p className="text-sm font-medium text-white">No items here</p>
            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
              {stage === 'enquiries' ? 'Create a new enquiry to get started.' : 'Items will appear here when advanced to this stage.'}
            </p>
          </div>
        ) : (
          <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2422' }}>
                {/* Common columns */}
                <TH width="120px">Job ID</TH>
                <TH>Customer</TH>
                {stage === 'enquiries' && <TH>Phone</TH>}
                {stage === 'enquiries' && <TH>Source</TH>}
                {stage === 'enquiries' && <TH>Assigned</TH>}
                {stage === 'qualified_leads' && <TH>Value</TH>}
                {stage === 'qualified_leads' && <TH>Designer</TH>}
                {stage === 'qualified_leads' && <TH>Qualified</TH>}
                {stage === 'qualified_leads' && <TH>Probability</TH>}
                {stage === 'order_processing' && <TH>Valuation</TH>}
                {stage === 'order_processing' && <TH>Deposit</TH>}
                {stage === 'order_processing' && <TH>Install Date</TH>}
                {stage === 'order_processing' && <TH>Fit Days</TH>}
                {stage === 'order_processing' && <TH>Site Dims</TH>}
                {stage === 'order_processing' && <TH>Designer</TH>}
                {stage === 'order_processing' && <TH>Project Manager</TH>}
                {stage === 'project_management' && <TH>Valuation</TH>}
                {stage === 'project_management' && <TH>Install Date</TH>}
                {stage === 'project_management' && <TH>Site Dims</TH>}
                {stage === 'project_management' && <TH>Installer</TH>}
                {stage === 'project_management' && <TH>Signed Off</TH>}
                {stage === 'archived' && <TH>Source</TH>}
                {stage === 'archived' && <TH>Value</TH>}
                {stage === 'archived' && <TH>Outcome</TH>}
                {stage === 'archived' && <TH>Date</TH>}
                <TH width="160px"></TH>
              </tr>
            </thead>
            <tbody>
              {initialJobs.map((job) => (
                <tr
                  key={job.id}
                  className="cursor-pointer transition-colors hover:bg-white/2"
                  onClick={() => setSelectedJob(job)}
                  style={{ opacity: advancing === job.id ? 0.5 : 1 }}
                >
                  <TD>
                    <span className="text-xs font-bold" style={{ color: '#B89763' }}>{job.job_id}</span>
                  </TD>
                  <TD>
                    <div>
                      <p className="font-semibold text-white">{job.customer_name}</p>
                      {job.postcode && <p className="text-xs" style={{ color: '#6B7280' }}>{job.postcode}</p>}
                    </div>
                  </TD>

                  {stage === 'enquiries' && <TD>{job.phone ?? '—'}</TD>}
                  {stage === 'enquiries' && <TD>{job.enquiry_source ?? '—'}</TD>}
                  {stage === 'enquiries' && <TD><ProfileCell profileId={job.assigned_to} profiles={profiles} /></TD>}

                  {stage === 'qualified_leads' && <TD><span className="font-semibold text-white">{fmt(job.quote_total)}</span></TD>}
                  {stage === 'qualified_leads' && <TD><ProfileCell profileId={job.designer_assigned} profiles={profiles} /></TD>}
                  {stage === 'qualified_leads' && <TD>{fmtDate(job.qualified_at)}</TD>}
                  {stage === 'qualified_leads' && <TD><ProbabilityCell source={job.enquiry_source} closeRates={closeRates} /></TD>}

                  {stage === 'order_processing' && <TD><span className="font-semibold text-white">{fmt(job.order_valuation)}</span></TD>}
                  {stage === 'order_processing' && <TD>{fmt(job.deposit_amount)}</TD>}
                  {stage === 'order_processing' && <TD>{fmtDate(job.proposed_install_date)}</TD>}
                  {stage === 'order_processing' && <TD>{job.fitting_days ? <span className="text-white font-medium">{job.fitting_days}d</span> : <span style={{ color: '#4A5250' }}>—</span>}</TD>}
                  {stage === 'order_processing' && <TD><CheckCell checked={job.site_dimensions_captured} /></TD>}
                  {stage === 'order_processing' && <TD><ProfileCell profileId={job.designer_assigned} profiles={profiles} /></TD>}
                  {stage === 'order_processing' && <TD><ProfileCell profileId={job.project_manager_assigned} profiles={profiles} /></TD>}

                  {stage === 'project_management' && <TD><span className="font-semibold text-white">{fmt(job.order_valuation)}</span></TD>}
                  {stage === 'project_management' && <TD>{fmtDate(job.signed_off_install_date)}</TD>}
                  {stage === 'project_management' && <TD><CheckCell checked={job.pm_site_dimensions_captured} /></TD>}
                  {stage === 'project_management' && <TD><ProfileCell profileId={job.installer_assigned} profiles={profiles} /></TD>}
                  {stage === 'project_management' && <TD><CheckCell checked={job.project_signed_off} /></TD>}

                  {stage === 'archived' && <TD>{job.enquiry_source ?? '—'}</TD>}
                  {stage === 'archived' && <TD>{fmt(job.order_valuation ?? job.quote_total)}</TD>}
                  {stage === 'archived' && (
                    <TD>
                      {job.dead_at ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#3B151522', color: '#EF4444' }}>Dead lead</span>
                      ) : job.signed_off_at ? (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#05402022', color: '#10B981' }}>Completed</span>
                      ) : (
                        <span style={{ color: '#6B7280' }}>—</span>
                      )}
                    </TD>
                  )}
                  {stage === 'archived' && <TD>{fmtDate(job.dead_at ?? job.signed_off_at ?? job.created_at)}</TD>}

                  <TD>
                    <ActionCell
                      job={job}
                      onAdvance={() => handleAdvance(job)}
                      onDead={stage === 'enquiries' ? () => handleDead(job) : undefined}
                    />
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

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
