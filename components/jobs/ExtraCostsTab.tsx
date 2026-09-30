'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, Trash2Icon, EyeOffIcon } from 'lucide-react'
import { getExtraCosts, addExtraCost, deleteExtraCost, getQuoteLines } from '@/lib/actions'
import type { ExtraCost } from '@/types'

const INPUT = 'w-full rounded-lg px-3 py-2 text-sm outline-none'
const INPUT_STYLE: React.CSSProperties = { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1D211F' }

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// Baseline margin (from what was quoted) vs. adjusted margin after costs the
// business absorbed but never showed the client — never rendered in
// QuoteTab's print views, this is its own internal-only ledger.
export default function ExtraCostsTab({ jobId }: { jobId: string }) {
  const [items, setItems] = useState<ExtraCost[]>([])
  const [baselineNet, setBaselineNet] = useState(0)
  const [baselineCost, setBaselineCost] = useState(0)
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getExtraCosts(jobId), getQuoteLines(jobId)]).then(([costs, { lines }]) => {
      if (cancelled) return
      setItems(costs)
      let net = 0
      let cost = 0
      for (const l of lines) {
        const retail = l.retail_price ?? 0
        const disc = l.discount_percent ?? 0
        net += retail * (1 - disc / 100)
        cost += l.cost_price ?? 0
      }
      setBaselineNet(net)
      setBaselineCost(cost)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [jobId])

  const handleAdd = async () => {
    const amt = parseFloat(amount)
    setError('')
    if (!description.trim()) { setError('Enter a description'); return }
    if (isNaN(amt) || amt <= 0) { setError('Enter an amount greater than 0'); return }
    setAdding(true)
    const result = await addExtraCost(jobId, description.trim(), amt)
    if (result.error) {
      setError(result.error)
    } else if (result.item) {
      setItems((prev) => [...prev, result.item as ExtraCost])
      setDescription('')
      setAmount('')
    }
    setAdding(false)
  }

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await deleteExtraCost(id)
  }

  const totalExtra = items.reduce((s, i) => s + i.amount, 0)
  const baselineMargin = baselineNet - baselineCost
  const baselineMarginPct = baselineNet > 0 ? (baselineMargin / baselineNet) * 100 : null
  const adjustedMargin = baselineMargin - totalExtra
  const adjustedMarginPct = baselineNet > 0 ? (adjustedMargin / baselineNet) * 100 : null

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
        <EyeOffIcon size={13} style={{ color: '#6B7280', flexShrink: 0 }} />
        <span className="text-xs" style={{ color: '#6B7280' }}>Internal only — never shown to the client or printed on a quote.</span>
      </div>

      {baselineNet > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Quoted Margin</span>
            <span className="text-sm font-bold" style={{ color: '#374151' }}>
              {fmt(baselineMargin)}{baselineMarginPct !== null ? ` (${baselineMarginPct.toFixed(1)}%)` : ''}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: totalExtra > 0 ? '#FEF2F2' : undefined }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: totalExtra > 0 ? '#DC2626' : '#9CA3AF' }}>Extra Costs</span>
            <span className="text-sm font-bold" style={{ color: totalExtra > 0 ? '#DC2626' : '#9CA3AF' }}>{totalExtra > 0 ? `−${fmt(totalExtra)}` : '£0.00'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: '#F9FAFB' }}>
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Adjusted Margin</span>
            <span className="text-sm font-bold" style={{ color: adjustedMargin >= 0 ? '#059669' : '#DC2626' }}>
              {fmt(adjustedMargin)}{adjustedMarginPct !== null ? ` (${adjustedMarginPct.toFixed(1)}%)` : ''}
            </span>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#B89763' }}>Unforeseen Costs</p>
        {items.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <span className="flex-1 text-sm" style={{ color: '#374151' }}>{item.description}</span>
                <span className="text-sm font-semibold" style={{ color: '#DC2626' }}>{fmt(item.amount)}</span>
                <button onClick={() => handleDelete(item.id)} className="flex-none p-1 rounded hover:bg-red-50">
                  <Trash2Icon size={13} style={{ color: '#D1D5DB' }} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Damaged worktop on site, re-cut"
            className={INPUT}
            style={{ ...INPUT_STYLE, flex: 1 }}
          />
          <div className="relative" style={{ width: '120px' }}>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9CA3AF' }}>£</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              placeholder="0.00"
              min="0"
              step="0.01"
              className={INPUT}
              style={{ ...INPUT_STYLE, paddingLeft: '16px' }}
            />
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex-none"
            style={{ backgroundColor: '#B89763' }}
          >
            <PlusIcon size={13} />Add
          </button>
        </div>
        {error && <p className="text-xs mt-1.5" style={{ color: '#DC2626' }}>{error}</p>}
        {items.length === 0 && !error && (
          <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>Nothing logged yet.</p>
        )}
      </div>
    </div>
  )
}
