'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { createMarketingChannel, updateMarketingChannel, deleteMarketingChannel } from '@/lib/actions'
import type { MarketingChannel, MarketingSpend, EnquirySource } from '@/types'

const FIELD_STYLE: React.CSSProperties = { backgroundColor: '#1D211F', border: '1px solid #3A4040' }

// Add, rename and remove marketing channels, and link each one to an enquiry
// source so the dashboard can work out cost per lead by source.
export default function ChannelManager({
  channels,
  enquirySources,
  spend,
}: {
  channels: MarketingChannel[]
  enquirySources: EnquirySource[]
  spend: MarketingSpend[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [newName, setNewName] = useState('')
  const [newSource, setNewSource] = useState('')
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(channels.map((c) => [c.id, c.name]))
  )
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<{ error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (result.error) setError(result.error)
      router.refresh()
    })
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    run(async () => {
      const result = await createMarketingChannel(newName, newSource || null)
      if (!result.error) {
        setNewName('')
        setNewSource('')
      }
      return result
    })
  }

  const handleRename = (ch: MarketingChannel) => {
    const name = (names[ch.id] ?? '').trim()
    if (!name || name === ch.name) {
      setNames((prev) => ({ ...prev, [ch.id]: ch.name }))
      return
    }
    run(() => updateMarketingChannel(ch.id, { name }))
  }

  return (
    <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: '#252B28', border: '1px solid #3A4040' }}>
      <p className="text-sm font-semibold text-white mb-1">Channels</p>
      <p className="text-xs mb-4" style={{ color: '#6B7280' }}>
        Link a channel to an enquiry source to see cost per lead by source on the dashboard.
      </p>

      <div className="space-y-2 mb-4">
        {channels.map((ch) => {
          const hasSpend = spend.some((s) => s.channel_id === ch.id)
          return (
            <div key={ch.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
              <input
                value={names[ch.id] ?? ch.name}
                onChange={(e) => setNames((prev) => ({ ...prev, [ch.id]: e.target.value }))}
                onBlur={() => handleRename(ch)}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={FIELD_STYLE}
              />
              <select
                value={ch.enquiry_source ?? ''}
                onChange={(e) => run(() => updateMarketingChannel(ch.id, { enquiry_source: e.target.value || null }))}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={FIELD_STYLE}
              >
                <option value="">Not linked to a source</option>
                {enquirySources.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button
                type="button"
                onClick={() => run(() => deleteMarketingChannel(ch.id))}
                disabled={isPending || hasSpend}
                className="p-2 rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-30"
                title={hasSpend ? 'Has spend recorded, so it can’t be deleted' : 'Delete channel'}
              >
                <Trash2Icon size={14} style={{ color: '#EF4444' }} />
              </button>
            </div>
          )
        })}
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New channel, e.g. Print & radio ads"
          className="rounded-lg px-3 py-2 text-sm text-white outline-none"
          style={FIELD_STYLE}
        />
        <select
          value={newSource}
          onChange={(e) => setNewSource(e.target.value)}
          className="rounded-lg px-3 py-2 text-sm text-white outline-none"
          style={FIELD_STYLE}
        >
          <option value="">Not linked to a source</option>
          {enquirySources.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <button
          type="submit"
          disabled={isPending || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: '#B89763' }}
        >
          <PlusIcon size={14} />
          Add
        </button>
      </form>

      {error && <p className="text-xs mt-3" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
