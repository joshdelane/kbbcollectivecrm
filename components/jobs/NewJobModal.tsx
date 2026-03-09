'use client'

import { useState } from 'react'
import { XIcon, PlusIcon } from 'lucide-react'
import { createJob, createEnquirySource } from '@/lib/actions'
import type { Profile, EnquirySource } from '@/types'

interface NewJobModalProps {
  profiles: Profile[]
  enquirySources: EnquirySource[]
  onSourceAdded: (s: EnquirySource) => void
  onClose: () => void
  onCreated: () => void
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '14px',
  color: '#1D211F',
  width: '100%',
  outline: 'none',
}

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: '#6B7280',
  marginBottom: '6px',
}

export default function NewJobModal({ profiles, enquirySources, onSourceAdded, onClose, onCreated }: NewJobModalProps) {
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    postcode: '',
    enquiry_source: '',
    rough_budget: '',
    notes: '',
    assigned_to: '',
  })
  const [addingSource, setAddingSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [savingSource, setSavingSource] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const handleAddSource = async () => {
    if (!newSourceName.trim()) return
    setSavingSource(true)
    const result = await createEnquirySource(newSourceName.trim())
    if (result.error) {
      setSavingSource(false)
      return
    }
    if (result.source) {
      onSourceAdded(result.source as EnquirySource)
      setForm((prev) => ({ ...prev, enquiry_source: result.source!.name }))
    }
    setNewSourceName('')
    setAddingSource(false)
    setSavingSource(false)
  }

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!form.customer_name.trim()) return
    setSubmitting(true)
    setError('')

    const result = await createJob({
      customer_name: form.customer_name.trim(),
      phone: form.phone || undefined,
      email: form.email || undefined,
      postcode: form.postcode || undefined,
      enquiry_source: form.enquiry_source || undefined,
      rough_budget: form.rough_budget ? parseFloat(form.rough_budget) : undefined,
      notes: form.notes || undefined,
      assigned_to: form.assigned_to || undefined,
    })

    if (result.error) {
      setError(result.error)
      setSubmitting(false)
    } else {
      onCreated()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ backgroundColor: '#FFFFFF', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: '#1D211F' }}>New Enquiry</h2>
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
              A unique job ID will be generated automatically
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-gray-100">
            <XIcon size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Customer name */}
          <div>
            <label style={LABEL_STYLE}>Customer name *</label>
            <input
              required
              value={form.customer_name}
              onChange={(e) => set('customer_name', e.target.value)}
              placeholder="John Smith"
              style={INPUT_STYLE}
            />
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={LABEL_STYLE}>Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="07700 000000" style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Email</label>
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="john@example.com" style={INPUT_STYLE} />
            </div>
          </div>

          {/* Postcode + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={LABEL_STYLE}>Postcode</label>
              <input value={form.postcode} onChange={(e) => set('postcode', e.target.value)} placeholder="SW1A 1AA" style={INPUT_STYLE} />
            </div>
            <div>
              <label style={LABEL_STYLE}>Rough budget (£)</label>
              <input type="number" value={form.rough_budget} onChange={(e) => set('rough_budget', e.target.value)} placeholder="15000" style={INPUT_STYLE} />
            </div>
          </div>

          {/* Enquiry source */}
          <div>
            <label style={LABEL_STYLE}>Enquiry source</label>
            {addingSource ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSource() } if (e.key === 'Escape') { setAddingSource(false); setNewSourceName('') } }}
                  placeholder="e.g. Trade Show"
                  style={{ ...INPUT_STYLE, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleAddSource}
                  disabled={savingSource || !newSourceName.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: '#B89763', whiteSpace: 'nowrap' }}
                >
                  {savingSource ? '...' : 'Add'}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingSource(false); setNewSourceName('') }}
                  className="px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  value={form.enquiry_source}
                  onChange={(e) => set('enquiry_source', e.target.value)}
                  style={{ ...INPUT_STYLE, cursor: 'pointer', flex: 1 }}
                >
                  <option value="">Select...</option>
                  {enquirySources.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setAddingSource(true)}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100"
                  style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', whiteSpace: 'nowrap' }}
                  title="Add new source"
                >
                  <PlusIcon size={13} /> New
                </button>
              </div>
            )}
          </div>

          {/* Assigned to */}
          <div>
            <label style={LABEL_STYLE}>Assigned to</label>
            <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
              <option value="">Unassigned</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.full_name}{p.company_name ? ` — ${p.company_name}` : ''}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={LABEL_STYLE}>Notes</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional details..." rows={3} style={{ ...INPUT_STYLE, resize: 'vertical' }} />
          </div>

          {error && (
            <p className="text-xs rounded-lg px-3 py-2" style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50" style={{ backgroundColor: '#B89763' }}>
              {submitting ? 'Creating...' : 'Create Enquiry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
