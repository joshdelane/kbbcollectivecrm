'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon, Trash2Icon, TrendingUpIcon } from 'lucide-react'
import { createMarketingSpend, deleteMarketingSpend } from '@/lib/actions'
import { MARKETING_CHANNELS } from '@/types'
import type { MarketingSpend, MarketingChannel } from '@/types'

interface MarketingViewProps {
  initialSpend: MarketingSpend[]
}

const CHANNEL_LABELS: Record<string, string> = Object.fromEntries(
  MARKETING_CHANNELS.map((c) => [c.key, c.label])
)

function fmt(n: number) {
  return `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatMonth(isoDate: string) {
  // isoDate is 'YYYY-MM-DD' (first of month)
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// Returns 'YYYY-MM-DD' for the first day of the current month
function currentMonthValue() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

export default function MarketingView({ initialSpend }: MarketingViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [channel, setChannel] = useState<MarketingChannel>('google_ads')
  const [amount, setAmount] = useState('')
  const [month, setMonth] = useState(currentMonthValue())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount greater than 0.')
      return
    }
    setSaving(true)
    setError(null)
    const result = await createMarketingSpend({
      channel,
      amount: amt,
      spend_month: month,
      notes: notes.trim() || undefined,
    })
    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      setShowForm(false)
      setChannel('google_ads')
      setAmount('')
      setMonth(currentMonthValue())
      setNotes('')
      startTransition(() => router.refresh())
    }
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteMarketingSpend(id)
      router.refresh()
    })
  }

  // Totals by channel
  const totalByChannel = MARKETING_CHANNELS.map((ch) => ({
    ...ch,
    total: initialSpend
      .filter((s) => s.channel === ch.key)
      .reduce((sum, s) => sum + Number(s.amount), 0),
  })).filter((ch) => ch.total > 0)

  const grandTotal = initialSpend.reduce((sum, s) => sum + Number(s.amount), 0)

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <TrendingUpIcon size={20} style={{ color: '#B89763' }} />
          <div>
            <h1 className="text-2xl font-bold text-white">Marketing Spend</h1>
            <p className="text-sm mt-0.5" style={{ color: '#6B7280' }}>
              Track spend per channel and month — used to calculate CPL &amp; CPA on the dashboard
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#B89763' }}
        >
          <PlusIcon size={15} />
          Add Entry
        </button>
      </div>

      {/* Summary cards */}
      {totalByChannel.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {totalByChannel.map((ch) => (
            <div key={ch.key} className="rounded-xl p-4" style={{ backgroundColor: '#252B28' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
                {ch.label}
              </p>
              <p className="text-2xl font-bold" style={{ color: '#B89763' }}>{fmt(ch.total)}</p>
              <p className="text-xs mt-1" style={{ color: '#4A5250' }}>all time</p>
            </div>
          ))}
          {grandTotal > 0 && (
            <div className="rounded-xl p-4" style={{ backgroundColor: '#1E2422', border: '1px solid #2A2F2D' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
                Total
              </p>
              <p className="text-2xl font-bold text-white">{fmt(grandTotal)}</p>
              <p className="text-xs mt-1" style={{ color: '#4A5250' }}>all channels, all time</p>
            </div>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-xl p-6 mb-6" style={{ backgroundColor: '#252B28', border: '1px solid #3A4040' }}>
          <p className="text-sm font-semibold text-white mb-4">New Marketing Spend Entry</p>
          <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Channel */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as MarketingChannel)}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#1D211F', border: '1px solid #3A4040' }}
              >
                {MARKETING_CHANNELS.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Month */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Month
              </label>
              <input
                type="month"
                value={month.slice(0, 7)} // 'YYYY-MM'
                onChange={(e) => setMonth(e.target.value ? e.target.value + '-01' : currentMonthValue())}
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#1D211F', border: '1px solid #3A4040' }}
                required
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Amount (£)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#1D211F', border: '1px solid #3A4040' }}
                required
              />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                Notes <span style={{ color: '#4A5250' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Q1 campaign"
                className="rounded-lg px-3 py-2 text-sm text-white outline-none"
                style={{ backgroundColor: '#1D211F', border: '1px solid #3A4040' }}
              />
            </div>

            {error && (
              <p className="sm:col-span-2 text-xs" style={{ color: '#EF4444' }}>{error}</p>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: '#B89763' }}
              >
                {saving ? 'Saving…' : 'Save Entry'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(null) }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
                style={{ color: '#6B7280' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      {initialSpend.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#252B28' }}>
          <TrendingUpIcon size={32} className="mx-auto mb-3" style={{ color: '#3A4040' }} />
          <p className="text-sm font-medium text-white mb-1">No marketing spend recorded yet</p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            Add your monthly spend per channel to unlock CPL and CPA on the dashboard.
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252B28' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#1E2422' }}>
                {['Month', 'Channel', 'Amount', 'Notes', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: '#6B7280', borderBottom: '1px solid #252B28' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialSpend.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-white/2">
                  <td className="px-4 py-3 text-sm text-white" style={{ borderBottom: '1px solid #1E2422' }}>
                    {formatMonth(row.spend_month)}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#9CA3AF', borderBottom: '1px solid #1E2422' }}>
                    {CHANNEL_LABELS[row.channel] ?? row.channel}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#B89763', borderBottom: '1px solid #1E2422' }}>
                    {fmt(Number(row.amount))}
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: '#6B7280', borderBottom: '1px solid #1E2422' }}>
                    {row.notes ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right" style={{ borderBottom: '1px solid #1E2422' }}>
                    <button
                      onClick={() => handleDelete(row.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-md transition-colors hover:bg-red-500/10 disabled:opacity-40"
                      title="Delete entry"
                    >
                      <Trash2Icon size={14} style={{ color: '#EF4444' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
