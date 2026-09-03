'use client'

import { useState } from 'react'
import { PlusIcon, PencilIcon, CheckIcon, XIcon, TagIcon } from 'lucide-react'
import { createEnquirySource, updateEnquirySource } from '@/lib/actions'
import type { EnquirySource } from '@/types'

export default function EnquirySourcesPanel({ initialSources }: { initialSources: EnquirySource[] }) {
  const [sources, setSources] = useState<EnquirySource[]>(initialSources)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')

  const startEdit = (s: EnquirySource) => {
    setEditingId(s.id)
    setEditValue(s.name)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (id: string) => {
    if (!editValue.trim()) return
    setSaving(true)
    const result = await updateEnquirySource(id, editValue.trim())
    if (result.error) {
      setError(result.error)
    } else {
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, name: editValue.trim() } : s)))
      setEditingId(null)
    }
    setSaving(false)
  }

  const handleAdd = async () => {
    if (!newName.trim()) return
    setSaving(true)
    const result = await createEnquirySource(newName.trim())
    if (result.error) {
      setError(result.error)
    } else if (result.source) {
      setSources((prev) => [...prev, result.source as EnquirySource])
      setNewName('')
      setAdding(false)
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#252B28' }}>
      <div className="flex items-center gap-2 mb-1">
        <TagIcon size={15} style={{ color: '#B89763' }} />
        <p className="text-sm font-semibold text-white">Enquiry Sources</p>
      </div>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Where enquiries can be attributed from. Rename an existing source or add a new one.
      </p>

      <div className="space-y-2">
        {sources.map((s) => (
          <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1D211F' }}>
            {editingId === s.id ? (
              <>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(s.id); if (e.key === 'Escape') cancelEdit() }}
                  className="flex-1 text-sm rounded-md px-2 py-1 outline-none"
                  style={{ backgroundColor: '#252B28', border: '1px solid #3A4040', color: '#FFFFFF' }}
                />
                <button onClick={() => saveEdit(s.id)} disabled={saving} className="p-1.5 rounded-md hover:bg-white/10 disabled:opacity-50">
                  <CheckIcon size={14} style={{ color: '#10B981' }} />
                </button>
                <button onClick={cancelEdit} className="p-1.5 rounded-md hover:bg-white/10">
                  <XIcon size={14} style={{ color: '#6B7280' }} />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm" style={{ color: '#D1D5DB' }}>{s.name}</span>
                <button onClick={() => startEdit(s)} className="p-1.5 rounded-md hover:bg-white/10" title="Rename">
                  <PencilIcon size={13} style={{ color: '#6B7280' }} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{error}</p>}

      <div className="mt-3">
        {adding ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
              placeholder="e.g. Trade Show"
              className="flex-1 text-sm rounded-md px-2.5 py-1.5 outline-none"
              style={{ backgroundColor: '#1D211F', border: '1px solid #2A2F2D', color: '#FFFFFF' }}
            />
            <button onClick={handleAdd} disabled={saving || !newName.trim()} className="px-3 py-1.5 rounded-md text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: '#B89763' }}>
              {saving ? '...' : 'Add'}
            </button>
            <button onClick={() => { setAdding(false); setNewName('') }} className="px-3 py-1.5 rounded-md text-xs" style={{ backgroundColor: '#1D211F', color: '#6B7280' }}>
              Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80" style={{ color: '#B89763' }}>
            <PlusIcon size={13} />Add source
          </button>
        )}
      </div>
    </div>
  )
}
