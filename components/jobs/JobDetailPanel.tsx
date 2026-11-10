'use client'

import { useState } from 'react'
import { XIcon, SaveIcon, PlusIcon, Trash2Icon } from 'lucide-react'
import { updateJob, createEnquirySource, deleteJob, revertJobToEnquiries, revertJobToQualified, revertJobToOrderProcessing, updateJobEnquiryDate, archiveQualifiedLead } from '@/lib/actions'
import { STAGES, LOST_REASONS } from '@/types'
import type { Job, Profile, Stage, EnquirySource } from '@/types'
import QuoteTab from './QuoteTab'
import SnagChecklist from './SnagChecklist'
import ExtraCostsTab from './ExtraCostsTab'

interface JobDetailPanelProps {
  job: Job
  profiles: Profile[]
  enquirySources: EnquirySource[]
  onSourceAdded: (s: EnquirySource) => void
  onClose: () => void
  onJobUpdated: () => void
  onDeleted: () => void
}

const STAGE_LABELS: Record<Stage, string> = {
  enquiries: 'Enquiry',
  qualified_leads: 'Qualified Lead',
  order_processing: 'Order Processing',
  project_management: 'Project Management',
  archived: 'Archived',
}

const STAGE_COLORS: Record<Stage, string> = {
  enquiries: '#3B82F6',
  qualified_leads: '#8B5CF6',
  order_processing: '#F59E0B',
  project_management: '#10B981',
  archived: '#6B7280',
}

type FormState = Partial<Omit<Job, 'id' | 'job_id' | 'stage' | 'created_at' | 'updated_at'>>

function toDateInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

const INPUT = 'w-full rounded-lg px-3 py-2 text-sm outline-none'
const INPUT_STYLE: React.CSSProperties = { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1D211F' }
const LABEL_STYLE: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={LABEL_STYLE}>{label}</label>{children}</div>
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="pt-4 pb-1" style={{ borderTop: '1px solid #F3F4F6' }}>
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B89763' }}>{title}</p>
    </div>
  )
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: '#B89763' }} />
      <span className="text-sm font-medium" style={{ color: '#374151' }}>{label}</span>
    </div>
  )
}

export default function JobDetailPanel({ job, profiles, enquirySources, onSourceAdded, onClose, onJobUpdated, onDeleted }: JobDetailPanelProps) {
  const [form, setForm] = useState<FormState>({
    customer_name: job.customer_name,
    phone: job.phone ?? '',
    email: job.email ?? '',
    address_line_1: job.address_line_1 ?? '',
    postcode: job.postcode ?? '',
    enquiry_source: job.enquiry_source ?? '',
    rough_budget: job.rough_budget ?? undefined,
    notes: job.notes ?? '',
    assigned_to: job.assigned_to ?? '',
    designer_assigned: job.designer_assigned ?? '',
    installer_assigned: job.installer_assigned ?? '',
    project_manager_assigned: job.project_manager_assigned ?? '',
    order_valuation: job.order_valuation ?? undefined,
    proposed_install_date: job.proposed_install_date ?? '',
    order_delivery_date: job.order_delivery_date ?? '',
    deposit_amount: job.deposit_amount ?? undefined,
    deposit_received_at: toDateInput(job.deposit_received_at),
    fitting_days: job.fitting_days ?? undefined,
    site_dimensions_captured: job.site_dimensions_captured,
    pm_site_dimensions_captured: job.pm_site_dimensions_captured,
    signed_off_install_date: job.signed_off_install_date ?? '',
    worktop_template_date: job.worktop_template_date ?? '',
    worktop_install_date: job.worktop_install_date ?? '',
    project_signed_off: job.project_signed_off,
    client_sign_off_date: job.client_sign_off_date ?? '',
    signed_off_at: toDateInput(job.signed_off_at),
    qualified_at: toDateInput(job.qualified_at),
    sold_at: toDateInput(job.sold_at),
    order_placed_at: toDateInput(job.order_placed_at),
    dead_at: toDateInput(job.dead_at),
    lost_reason: job.lost_reason ?? '',
    exclude_from_metrics: job.exclude_from_metrics ?? false,
  })
  const [enquiryDate, setEnquiryDate] = useState(toDateInput(job.created_at))
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [savingSource, setSavingSource] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmRevert, setConfirmRevert] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [confirmRevertOrder, setConfirmRevertOrder] = useState(false)
  const [revertingOrder, setRevertingOrder] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [archiveReason, setArchiveReason] = useState('')
  const [archiving, setArchiving] = useState(false)
  const [confirmUnqualify, setConfirmUnqualify] = useState(false)
  const [unqualifying, setUnqualifying] = useState(false)
  const isLost = job.stage === 'archived' && !job.signed_off_at

  const set = (field: keyof FormState, value: string | number | boolean | null) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    setSavingSource(true)
    const result = await createEnquirySource(newSourceName.trim())
    if (!result.error && result.source) {
      onSourceAdded(result.source as EnquirySource)
      set('enquiry_source', result.source.name)
    }
    setNewSourceName('')
    setAddingSource(false)
    setSavingSource(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteJob(job.id)
    if (result.error) {
      setError(result.error)
      setDeleting(false)
      setConfirmDelete(false)
    } else {
      onDeleted()
    }
  }

  const handleSave = async () => {
    // Validate all date fields have a sensible year
    const datesToCheck: [string, string][] = [
      ['Enquiry received', enquiryDate],
      ...(['qualified_at', 'sold_at', 'order_placed_at', 'dead_at', 'signed_off_at',
        'deposit_received_at', 'proposed_install_date', 'signed_off_install_date',
        'worktop_template_date', 'worktop_install_date', 'client_sign_off_date'] as const)
        .map((f) => [f.replace(/_/g, ' '), (form[f] as string) ?? ''] as [string, string]),
    ]
    for (const [label, val] of datesToCheck) {
      if (val) {
        const year = parseInt(val.slice(0, 4), 10)
        if (isNaN(year) || year < 2000 || year > 2099) {
          setError(`Invalid year in "${label}" — please enter a date between 2000 and 2099`)
          return
        }
      }
    }

    setSaving(true)
    setError('')
    // signed_off_at / dead_at decide whether an archived job shows as Finished
    // or Dead, so they can be changed here but not cleared
    const toSave = { ...form }
    if (!toSave.signed_off_at) delete toSave.signed_off_at
    if (!toSave.dead_at) delete toSave.dead_at
    const [jobResult, dateResult] = await Promise.all([
      updateJob(job.id, toSave),
      enquiryDate !== toDateInput(job.created_at)
        ? updateJobEnquiryDate(job.id, enquiryDate)
        : Promise.resolve({ success: true }),
    ])
    const err = jobResult.error ?? (dateResult as { error?: string }).error
    if (err) {
      setError(err)
    } else {
      setSaved(true)
      setTimeout(() => onJobUpdated(), 400)
    }
    setSaving(false)
  }

  const handleRevert = async () => {
    setReverting(true)
    const result = await revertJobToQualified(job.id)
    if (result.error) {
      setError(result.error)
      setReverting(false)
      setConfirmRevert(false)
    } else {
      onJobUpdated()
    }
  }

  const handleRevertOrder = async () => {
    setRevertingOrder(true)
    const result = await revertJobToOrderProcessing(job.id)
    if (result.error) {
      setError(result.error)
      setRevertingOrder(false)
      setConfirmRevertOrder(false)
    } else {
      onJobUpdated()
    }
  }

  const handleArchive = async () => {
    setArchiving(true)
    const result = await archiveQualifiedLead(job.id, archiveReason || undefined)
    if (result.error) {
      setError(result.error)
      setArchiving(false)
      setConfirmArchive(false)
    } else {
      onJobUpdated()
    }
  }

  const handleUnqualify = async () => {
    setUnqualifying(true)
    const result = await revertJobToEnquiries(job.id)
    if (result.error) {
      setError(result.error)
      setUnqualifying(false)
      setConfirmUnqualify(false)
    } else {
      onJobUpdated()
    }
  }

  const stageColor = STAGE_COLORS[job.stage]
  const stageIndex = STAGES.findIndex((s) => s.key === job.stage)
  const showOrderProcessing = stageIndex >= 2
  const showProjectManagement = stageIndex >= 3
  const showQuoteTab = stageIndex >= 1

  const [tab, setTab] = useState<'details' | 'quote' | 'costs'>('details')

  return (
    <>
      <div className="fixed inset-0 z-40" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl" style={{ backgroundColor: '#FFFFFF', width: '50vw', minWidth: '480px', maxWidth: '900px' }}>

        {/* Header */}
        <div className="flex-none flex items-start justify-between px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold" style={{ color: '#B89763' }}>{job.job_id}</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: stageColor + '22', color: stageColor }}>
                {STAGE_LABELS[job.stage]}
              </span>
            </div>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>
              Created {new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100 flex-none">
            <XIcon size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Tab bar — only for Qualified Leads and Order Processing */}
        {showQuoteTab && (
          <div className="flex-none flex" style={{ borderBottom: '1px solid #F3F4F6' }}>
            {(showOrderProcessing ? (['details', 'quote', 'costs'] as const) : (['details', 'quote'] as const)).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-6 py-3 text-sm font-semibold transition-colors"
                style={{
                  color: tab === t ? '#B89763' : '#9CA3AF',
                  borderBottom: tab === t ? '2px solid #B89763' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {t === 'details' ? 'Details' : t === 'quote' ? 'Quote' : 'Extra Costs'}
              </button>
            ))}
          </div>
        )}

        {/* Quote tab */}
        {showQuoteTab && tab === 'quote' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <QuoteTab job={job} />
          </div>
        )}

        {/* Extra costs tab */}
        {showOrderProcessing && tab === 'costs' && (
          <div className="flex-1 min-h-0 flex flex-col">
            <ExtraCostsTab jobId={job.id} />
          </div>
        )}

        {/* Details form + footer */}
        {(!showQuoteTab || tab === 'details') && tab !== 'costs' && <>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <SectionHeading title="Customer Details" />

          <Field label="Customer name">
            <input className={INPUT} style={INPUT_STYLE} value={(form.customer_name as string) ?? ''} onChange={(e) => set('customer_name', e.target.value)} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <input type="tel" className={INPUT} style={INPUT_STYLE} value={(form.phone as string) ?? ''} onChange={(e) => set('phone', e.target.value)} placeholder="07700 000000" />
            </Field>
            <Field label="Email">
              <input type="email" className={INPUT} style={INPUT_STYLE} value={(form.email as string) ?? ''} onChange={(e) => set('email', e.target.value)} placeholder="email@example.com" />
            </Field>
          </div>

          <Field label="Address line 1">
            <input className={INPUT} style={INPUT_STYLE} value={(form.address_line_1 as string) ?? ''} onChange={(e) => set('address_line_1', e.target.value)} placeholder="123 High Street" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Postcode">
              <input className={INPUT} style={INPUT_STYLE} value={(form.postcode as string) ?? ''} onChange={(e) => set('postcode', e.target.value)} placeholder="SW1A 1AA" />
            </Field>
            <Field label="Rough budget (£, ex. VAT)">
              <input type="number" className={INPUT} style={INPUT_STYLE} value={(form.rough_budget as number) ?? ''} onChange={(e) => set('rough_budget', e.target.value ? parseFloat(e.target.value) : null)} placeholder="15000" />
            </Field>
          </div>

          {/* Enquiry source */}
          <Field label="Enquiry source">
            {addingSource ? (
              <div className="flex gap-2">
                <input autoFocus value={newSourceName} onChange={(e) => setNewSourceName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSource() } if (e.key === 'Escape') { setAddingSource(false); setNewSourceName('') } }} placeholder="e.g. Trade Show" className={INPUT} style={{ ...INPUT_STYLE, flex: 1 }} />
                <button type="button" onClick={handleAddSource} disabled={savingSource || !newSourceName.trim()} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#B89763', whiteSpace: 'nowrap' }}>{savingSource ? '...' : 'Add'}</button>
                <button type="button" onClick={() => { setAddingSource(false); setNewSourceName('') }} className="px-3 py-1.5 rounded-lg text-xs" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>Cancel</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer', flex: 1 }} value={(form.enquiry_source as string) ?? ''} onChange={(e) => set('enquiry_source', e.target.value || null)}>
                  <option value="">Select...</option>
                  {enquirySources.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button type="button" onClick={() => setAddingSource(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', whiteSpace: 'nowrap' }} title="Add new source">
                  <PlusIcon size={12} /> New
                </button>
              </div>
            )}
          </Field>

          <Field label="Assigned to">
            <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.assigned_to as string) ?? ''} onChange={(e) => set('assigned_to', e.target.value || null)}>
              <option value="">Unassigned</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>)}
            </select>
          </Field>

          <Field label="Notes">
            <textarea className={INPUT} style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={3} value={(form.notes as string) ?? ''} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional details..." />
          </Field>

          <div>
            <CheckboxField label="Exclude from sales metrics" checked={(form.exclude_from_metrics as boolean) ?? false} onChange={(v) => set('exclude_from_metrics', v)} />
            <p className="text-xs pl-7" style={{ color: '#9CA3AF' }}>
              For small jobs (e.g. labour only). Still counts towards sales agreed, but not average order value or close rates.
            </p>
          </div>

          {isLost && (
            <Field label="Lost reason">
              <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.lost_reason as string) ?? ''} onChange={(e) => set('lost_reason', e.target.value || null)}>
                <option value="">No reason given</option>
                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
          )}

          {stageIndex >= 1 && (
            <>
              <SectionHeading title="Qualified Lead" />
              <Field label="Designer assigned">
                <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.designer_assigned as string) ?? ''} onChange={(e) => set('designer_assigned', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Date deposit received">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.deposit_received_at as string) ?? ''} onChange={(e) => set('deposit_received_at', e.target.value || null)} />
              </Field>
            </>
          )}

          {showOrderProcessing && (
            <>
              <SectionHeading title="Order Processing" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Order valuation (£)">
                  <input type="number" className={INPUT} style={INPUT_STYLE} value={(form.order_valuation as number) ?? ''} onChange={(e) => set('order_valuation', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" />
                </Field>
                <Field label="Deposit amount (£)">
                  <input type="number" className={INPUT} style={INPUT_STYLE} value={(form.deposit_amount as number) ?? ''} onChange={(e) => set('deposit_amount', e.target.value ? parseFloat(e.target.value) : null)} placeholder="0.00" />
                </Field>
              </div>
              <Field label="Designer assigned">
                <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.designer_assigned as string) ?? ''} onChange={(e) => set('designer_assigned', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>)}
                </select>
              </Field>
              <Field label="Project manager assigned">
                <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.project_manager_assigned as string) ?? ''} onChange={(e) => set('project_manager_assigned', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Proposed install date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.proposed_install_date as string) ?? ''} onChange={(e) => set('proposed_install_date', e.target.value || null)} />
                </Field>
                <Field label="Order delivery date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.order_delivery_date as string) ?? ''} onChange={(e) => set('order_delivery_date', e.target.value || null)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fitting days">
                  <input type="number" className={INPUT} style={INPUT_STYLE} value={(form.fitting_days as number) ?? ''} onChange={(e) => set('fitting_days', e.target.value ? parseInt(e.target.value, 10) : null)} placeholder="3" min="1" />
                </Field>
              </div>
              <CheckboxField label="Site dimensions captured" checked={(form.site_dimensions_captured as boolean) ?? false} onChange={(v) => set('site_dimensions_captured', v)} />
            </>
          )}

          {showProjectManagement && (
            <>
              <SectionHeading title="Project Management" />
              <Field label="Signed off install date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.signed_off_install_date as string) ?? ''} onChange={(e) => set('signed_off_install_date', e.target.value || null)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Worktop template date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.worktop_template_date as string) ?? ''} onChange={(e) => set('worktop_template_date', e.target.value || null)} />
                </Field>
                <Field label="Worktop install date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.worktop_install_date as string) ?? ''} onChange={(e) => set('worktop_install_date', e.target.value || null)} />
                </Field>
              </div>
              <Field label="Installer assigned">
                <select className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }} value={(form.installer_assigned as string) ?? ''} onChange={(e) => set('installer_assigned', e.target.value || null)}>
                  <option value="">Unassigned</option>
                  {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>)}
                </select>
              </Field>
              <CheckboxField label="Site dimensions captured" checked={(form.pm_site_dimensions_captured as boolean) ?? false} onChange={(v) => set('pm_site_dimensions_captured', v)} />
              <Field label="Snag list">
                <SnagChecklist jobId={job.id} legacyNote={job.snag_list} />
              </Field>
              <CheckboxField label="Project signed off by customer" checked={(form.project_signed_off as boolean) ?? false} onChange={(v) => set('project_signed_off', v)} />
              <Field label="Client sign-off date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.client_sign_off_date as string) ?? ''} onChange={(e) => set('client_sign_off_date', e.target.value || null)} />
              </Field>
            </>
          )}

          <SectionHeading title="History" />
          <div className="space-y-3 pb-4">
            <Field label="Enquiry received">
              <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={enquiryDate} onChange={(e) => setEnquiryDate(e.target.value)} />
            </Field>
            {stageIndex >= 1 && (
              <Field label="Qualified date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.qualified_at as string) ?? ''} onChange={(e) => set('qualified_at', e.target.value || null)} />
              </Field>
            )}
            {stageIndex >= 2 && (
              <Field label="Project sold date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.sold_at as string) ?? ''} onChange={(e) => set('sold_at', e.target.value || null)} />
              </Field>
            )}
            {stageIndex >= 3 && (
              <Field label="Order placed date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.order_placed_at as string) ?? ''} onChange={(e) => set('order_placed_at', e.target.value || null)} />
              </Field>
            )}
            {job.signed_off_at && (
              <Field label="Signed off date">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.signed_off_at as string) ?? ''} onChange={(e) => set('signed_off_at', e.target.value || null)} />
              </Field>
            )}
            {job.dead_at && (
              <Field label="Marked dead">
                <input type="date" className={INPUT} style={INPUT_STYLE} min="2000-01-01" max="2099-12-31" value={(form.dead_at as string) ?? ''} onChange={(e) => set('dead_at', e.target.value || null)} />
              </Field>
            )}
          </div>
        </div>

        <div className="flex-none px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          {confirmDelete ? (
            <>
              <p className="text-xs flex-1 font-medium" style={{ color: '#DC2626' }}>Permanently delete this job?</p>
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#DC2626' }}>
                <Trash2Icon size={14} />
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </>
          ) : confirmArchive ? (
            <>
              <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Archive this lead?</p>
              <select className="flex-1 rounded-lg px-2 py-2 text-xs outline-none" style={INPUT_STYLE} value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)}>
                <option value="">Why was it lost?</option>
                {LOST_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <button onClick={() => setConfirmArchive(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleArchive} disabled={archiving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#6B7280' }}>
                {archiving ? 'Archiving...' : 'Yes, Archive'}
              </button>
            </>
          ) : confirmUnqualify ? (
            <>
              <p className="text-xs flex-1 font-medium" style={{ color: '#6B7280' }}>Move back to Enquiries?</p>
              <button onClick={() => setConfirmUnqualify(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleUnqualify} disabled={unqualifying} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#3B82F6' }}>
                {unqualifying ? 'Moving...' : 'Yes, Move Back'}
              </button>
            </>
          ) : confirmRevert ? (
            <>
              <p className="text-xs flex-1 font-medium" style={{ color: '#6B7280' }}>Move back to Qualified Lead?</p>
              <button onClick={() => setConfirmRevert(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleRevert} disabled={reverting} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#8B5CF6' }}>
                {reverting ? 'Moving...' : 'Yes, Move Back'}
              </button>
            </>
          ) : confirmRevertOrder ? (
            <>
              <p className="text-xs flex-1 font-medium" style={{ color: '#6B7280' }}>Move back to Order Processing?</p>
              <button onClick={() => setConfirmRevertOrder(false)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleRevertOrder} disabled={revertingOrder} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#F59E0B' }}>
                {revertingOrder ? 'Moving...' : 'Yes, Move Back'}
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                <Trash2Icon size={14} />
                Delete
              </button>
              {job.stage === 'qualified_leads' && (
                <button onClick={() => setConfirmUnqualify(true)} className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}>
                  ← Back to Enquiries
                </button>
              )}
              {job.stage === 'qualified_leads' && (
                <button onClick={() => setConfirmArchive(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                  Archive
                </button>
              )}
              {job.stage === 'order_processing' && (
                <button onClick={() => setConfirmRevert(true)} className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                  ← Back to Qualified
                </button>
              )}
              {job.stage === 'project_management' && (
                <button onClick={() => setConfirmRevertOrder(true)} className="px-3 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>
                  ← Back to Order Processing
                </button>
              )}
              {error && <p className="text-xs flex-1" style={{ color: '#DC2626' }}>{error}</p>}
              {saved && <p className="text-xs flex-1" style={{ color: '#059669' }}>Saved!</p>}
              {!error && !saved && <div className="flex-1" />}
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#B89763' }}>
                <SaveIcon size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
        </>}
      </div>
    </>
  )
}
