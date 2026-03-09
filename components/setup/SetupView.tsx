'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createOrganisation, joinOrganisation } from '@/lib/actions'

type Mode = 'choose' | 'create' | 'join'

export default function SetupView() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('choose')
  const [name, setName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError('')
    const result = await createOrganisation(name.trim(), prefix.trim() || undefined)
    if (result.error) { setError(result.error); setSaving(false) }
    else router.push('/dashboard')
  }

  const handleJoin = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!code.trim()) return
    setSaving(true)
    setError('')
    const result = await joinOrganisation(code.trim().toUpperCase())
    if (result.error) { setError(result.error); setSaving(false) }
    else router.push('/dashboard')
  }

  const inputStyle = { backgroundColor: '#1E2422', border: '1px solid #2A2F2D', color: '#FFFFFF' }
  const inputClass = 'w-full rounded-lg px-3 py-2.5 text-sm text-white outline-none'
  const labelClass = 'block text-xs font-semibold uppercase tracking-wider mb-1.5'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1D211F' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: '#161A18', border: '1px solid #252B28' }}>
          <div className="px-8 pt-8 pb-4">
            <p className="text-lg font-bold text-white">KBB Collective CRM</p>
            <p className="text-sm mt-1" style={{ color: '#B89763' }}>Set up your workspace</p>
          </div>

          {mode === 'choose' && (
            <div className="px-8 pb-8 pt-2 space-y-3">
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                Are you setting up a new account or joining a colleague&apos;s?
              </p>
              <button onClick={() => setMode('create')}
                className="w-full rounded-xl px-5 py-4 text-left hover:opacity-90"
                style={{ backgroundColor: '#1E2422', border: '1px solid #2A2F2D' }}>
                <p className="text-sm font-semibold text-white">Create new organisation</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>For business owners setting up their account</p>
              </button>
              <button onClick={() => setMode('join')}
                className="w-full rounded-xl px-5 py-4 text-left hover:opacity-90"
                style={{ backgroundColor: '#1E2422', border: '1px solid #2A2F2D' }}>
                <p className="text-sm font-semibold text-white">Join an existing organisation</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>For team members — you&apos;ll need an invite code from your manager</p>
              </button>
            </div>
          )}

          {mode === 'create' && (
            <form onSubmit={handleCreate} className="px-8 pb-8 pt-2 space-y-5">
              <button onClick={() => { setMode('choose'); setError('') }} type="button"
                className="text-xs" style={{ color: '#6B7280' }}>← Back</button>
              <div>
                <label className={labelClass} style={{ color: '#9CA3AF' }}>Company name</label>
                <input autoFocus type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Kitchens" required className={inputClass} style={inputStyle} />
              </div>
              <div>
                <label className={labelClass} style={{ color: '#9CA3AF' }}>
                  Job ID prefix <span style={{ color: '#4A5250' }}>(2–4 letters, optional)</span>
                </label>
                <input type="text" value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
                  placeholder="e.g. ACK" maxLength={4} className={inputClass} style={inputStyle} />
                <p className="text-xs mt-1" style={{ color: '#4A5250' }}>
                  Jobs will be numbered ACK-2026-00001 etc. Defaults to KBB.
                </p>
              </div>
              {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
              <button type="submit" disabled={saving || !name.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#B89763' }}>
                {saving ? 'Creating...' : 'Create organisation'}
              </button>
            </form>
          )}

          {mode === 'join' && (
            <form onSubmit={handleJoin} className="px-8 pb-8 pt-2 space-y-5">
              <button onClick={() => { setMode('choose'); setError('') }} type="button"
                className="text-xs" style={{ color: '#6B7280' }}>← Back</button>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Ask your manager for the invite code shown on the Team page.
              </p>
              <div>
                <label className={labelClass} style={{ color: '#9CA3AF' }}>Invite code</label>
                <input autoFocus type="text" value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4" required
                  className={`${inputClass} font-mono tracking-widest`} style={inputStyle} />
              </div>
              {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
              <button type="submit" disabled={saving || !code.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: '#B89763' }}>
                {saving ? 'Joining...' : 'Join organisation'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
