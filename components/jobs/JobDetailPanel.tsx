'use client'

import { useState } from 'react'
import { XIcon, SaveIcon, PlusIcon } from 'lucide-react'
import { updateJob, createEnquirySource } from '@/lib/actions'
import { STAGES } from '@/types'
import type { Job, Profile, Stage, EnquirySource } from '@/types'
import QuoteTab from './QuoteTab'

interface JobDetailPanelProps {
  job: Job
  profiles: Profile[]
  enquirySources: EnquirySource[]
  onSourceAdded: (s: EnquirySource) => void
  onClose: () => void
  onJobUpdated: () => void
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

type FormState = Partial<Omit<Job, 'id' | 'job_id' | 'stage' | 'created_at' | 'updated_at' | 'qualified_at' | 'sold_at' | 'order_placed_at' | 'dead_at'>>

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

export default function JobDetailPanel({ job, profiles, enquirySources, onSourceAdded, onClose, onJobUpdated }: JobDetailPanelProps) {
  const [form, setForm] = useState<FormState>({
    customer_name: job.customer_name,
    phone: job.phone ?? '',
    email: job.email ?? '',
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
    deposit_amount: job.deposit_amount ?? undefined,
    deposit_received_at: job.deposit_received_at ?? '',
    fitting_days: job.fitting_days ?? undefined,
    site_dimensions_captured: job.site_dimensions_captured,
    pm_site_dimensions_captured: job.pm_site_dimensions_captured,
    signed_off_install_date: job.signed_off_install_date ?? '',
    worktop_template_date: job.worktop_template_date ?? '',
    worktop_install_date: job.worktop_install_date ?? '',
    snag_list: job.snag_list ?? '',
    project_signed_off: job.project_signed_off,
    client_sign_off_date: job.client_sign_off_date ?? '',
    signed_off_at: job.signed_off_at ?? '',
  })
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [savingSource, setSavingSource] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await updateJob(job.id, form)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => onJobUpdated(), 400)
    }
    setSaving(false)
  }

  const stageColor = STAGE_COLORS[job.stage]
  const stageIndex = STAGES.findIndex((s) => s.key === job.stage)
  const showOrderProcessing = stageIndex >= 2
  const showProjectManagement = stageIndex >= 3
  const showQuoteTab = stageIndex >= 1

  const [tab, setTab] = useState<'details' | 'quote'>('details')

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
            {(['details', 'quote'] as const).map((t) => (
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
                {t === 'details' ? 'Details' : 'Quote'}
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

        {/* Details form + footer */}
        {(!showQuoteTab || tab === 'details') && <>
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Postcode">
              <input className={INPUT} style={INPUT_STYLE} value={(form.postcode as string) ?? ''} onChange={(e) => set('postcode', e.target.value)} placeholder="SW1A 1AA" />
            </Field>
            <Field label="Rough budget (£)">
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
                <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.deposit_received_at as string) ?? ''} onChange={(e) => set('deposit_received_at', e.target.value || null)} />
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
                  <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.proposed_install_date as string) ?? ''} onChange={(e) => set('proposed_install_date', e.target.value || null)} />
                </Field>
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
                <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.signed_off_install_date as string) ?? ''} onChange={(e) => set('signed_off_install_date', e.target.value || null)} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Worktop template date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.worktop_template_date as string) ?? ''} onChange={(e) => set('worktop_template_date', e.target.value || null)} />
                </Field>
                <Field label="Worktop install date">
                  <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.worktop_install_date as string) ?? ''} onChange={(e) => set('worktop_install_date', e.target.value || null)} />
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
                <textarea className={INPUT} style={{ ...INPUT_STYLE, resize: 'vertical' }} rows={4} value={(form.snag_list as string) ?? ''} onChange={(e) => set('snag_list', e.target.value)} placeholder="List any snags or outstanding items..." />
              </Field>
              <CheckboxField label="Project signed off by customer" checked={(form.project_signed_off as boolean) ?? false} onChange={(v) => set('project_signed_off', v)} />
              <Field label="Client sign-off date">
                <input type="date" className={INPUT} style={INPUT_STYLE} value={(form.client_sign_off_date as string) ?? ''} onChange={(e) => set('client_sign_off_date', e.target.value || null)} />
              </Field>
            </>
          )}

          <SectionHeading title="History" />
          <div className="space-y-2 pb-4">
            {[
              { label: 'Enquiry received', date: job.created_at },
              { label: 'Qualified', date: job.qualified_at },
              { label: 'Project sold', date: job.sold_at },
              { label: 'Order placed', date: job.order_placed_at },
              { label: 'Signed off', date: job.signed_off_at },
              { label: 'Marked dead', date: job.dead_at },
            ]
              .filter((h) => h.date)
              .map((h) => (
                <div key={h.label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: h.label === 'Marked dead' ? '#EF4444' : '#6B7280' }}>{h.label}</span>
                  <span className="text-xs font-medium" style={{ color: '#374151' }}>
                    {new Date(h.date!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              ))}
          </div>
        </div>

        <div className="flex-none px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
          {error && <p className="text-xs flex-1" style={{ color: '#DC2626' }}>{error}</p>}
          {saved && <p className="text-xs flex-1" style={{ color: '#059669' }}>Saved!</p>}
          {!error && !saved && <div className="flex-1" />}
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#B89763' }}>
            <SaveIcon size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        </>}
      </div>
    </>
  )
}
