'use client'

import { useState } from 'react'
import { FileTextIcon } from 'lucide-react'
import { saveOrgTermsAndConditions } from '@/lib/actions'

export default function TermsAndConditionsPanel({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const dirty = text !== initialText

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await saveOrgTermsAndConditions(text)
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: '#252B28' }}>
      <div className="flex items-center gap-2 mb-1">
        <FileTextIcon size={15} style={{ color: '#B89763' }} />
        <p className="text-sm font-semibold text-white">Terms &amp; Conditions</p>
      </div>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Printed at the bottom of every quote and proof of purchase shown to a client.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Paste your company's terms and conditions here..."
        className="w-full text-sm rounded-lg px-3 py-2.5 outline-none resize-y"
        style={{ backgroundColor: '#1D211F', border: '1px solid #2A2F2D', color: '#D1D5DB' }}
      />

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#B89763' }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
        {saved && <p className="text-xs" style={{ color: '#10B981' }}>Saved!</p>}
      </div>
    </div>
  )
}
