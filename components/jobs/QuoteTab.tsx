'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, Trash2Icon, SaveIcon, Maximize2Icon, PrinterIcon, XIcon, CopyPlusIcon } from 'lucide-react'
import { getQuoteLines, getQuoteRevisionNumbers, saveQuoteLines, createQuoteRevision } from '@/lib/actions'
import { QUOTE_CATEGORIES } from '@/types'
import type { Job, QuoteCategory } from '@/types'

interface LineItem {
  category: QuoteCategory | null
  description: string
  retail_price: string
  cost_price: string
  is_ordered: boolean
}

const INPUT = 'w-full rounded px-2 py-1.5 text-sm outline-none'
const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#F9FAFB',
  border: '1px solid #E5E7EB',
  color: '#1D211F',
}
const LABEL_STYLE: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 600,
  color: '#9CA3AF',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
}

function fmt(n: number) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function parseNum(s: string): number {
  return parseFloat(s) || 0
}

// ─── Proof of Purchase ───────────────────────────────────────────────────────

function ProofOfPurchase({
  job,
  lines,
  onClose,
}: {
  job: Job
  lines: LineItem[]
  onClose: () => void
}) {
  const appliances = lines.filter((l) => l.category === 'Appliances' && l.description.trim())

  const depositDate = job.deposit_received_at
    ? new Date(job.deposit_received_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const signOffDate = job.client_sign_off_date
    ? new Date(job.client_sign_off_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : job.signed_off_at
    ? new Date(job.signed_off_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .pop-print-root, .pop-print-root * { visibility: visible !important; }
          .pop-print-root { position: fixed !important; inset: 0 !important; z-index: 9999 !important; background: white !important; overflow: visible !important; padding: 32px !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="no-print sticky top-0 z-[70] flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#161A18', borderBottom: '1px solid #2A2F2D' }}>
          <span className="text-sm font-semibold text-white">{job.job_id} — Proof of Purchase</span>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#B89763' }}>
              <PrinterIcon size={14} />Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><XIcon size={18} style={{ color: '#9CA3AF' }} /></button>
          </div>
        </div>
        <div className="pop-print-root w-full max-w-3xl mx-auto mt-6 mb-12 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="px-10 pt-10 pb-6" style={{ borderBottom: '2px solid #F3F4F6' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold" style={{ color: '#1D211F' }}>Proof of Purchase</p>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>KBB Collective</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: '#B89763' }}>{job.job_id}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Prepared for</p>
                <p className="text-base font-semibold" style={{ color: '#1D211F' }}>{job.customer_name}</p>
                {job.phone && <p className="text-sm" style={{ color: '#6B7280' }}>{job.phone}</p>}
                {job.email && <p className="text-sm" style={{ color: '#6B7280' }}>{job.email}</p>}
                {job.postcode && <p className="text-sm" style={{ color: '#6B7280' }}>{job.postcode}</p>}
              </div>
              <div>
                <div className="mb-3">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Date Deposit Received</p>
                  <p className="text-sm font-semibold" style={{ color: '#1D211F' }}>{depositDate}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#9CA3AF' }}>Date Kitchen Signed Off</p>
                  <p className="text-sm font-semibold" style={{ color: '#1D211F' }}>{signOffDate}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="px-10 py-6">
            <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#9CA3AF' }}>Appliances</p>
            {appliances.length === 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No appliances listed on this quote.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                    <th className="text-left pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Item</th>
                    <th className="text-right pb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {appliances.map((l, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <td className="py-2.5" style={{ color: '#1D211F' }}>{l.description}</td>
                      <td className="py-2.5 text-right font-medium" style={{ color: '#374151' }}>
                        {parseNum(l.retail_price) > 0 ? `£${fmt(parseNum(l.retail_price))}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Full-screen / print overlay ─────────────────────────────────────────────

function FullScreenQuote({
  job,
  lines,
  revision,
  onClose,
  onToggleOrdered,
}: {
  job: Job
  lines: LineItem[]
  revision: number
  onClose: () => void
  onToggleOrdered: (i: number) => void
}) {
  const totalRetail = lines.reduce((s, l) => s + parseNum(l.retail_price), 0)
  const totalCost = lines.reduce((s, l) => s + parseNum(l.cost_price), 0)
  const totalMargin = totalRetail - totalCost

  // Group lines by category for display
  const grouped: { category: string; items: { line: LineItem; idx: number }[] }[] = []
  const uncategorised: { line: LineItem; idx: number }[] = []
  const catMap: Record<string, { line: LineItem; idx: number }[]> = {}

  lines.forEach((line, idx) => {
    if (line.category) {
      if (!catMap[line.category]) catMap[line.category] = []
      catMap[line.category].push({ line, idx })
    } else {
      uncategorised.push({ line, idx })
    }
  })
  QUOTE_CATEGORIES.forEach((cat) => {
    if (catMap[cat]?.length) grouped.push({ category: cat, items: catMap[cat] })
  })
  if (uncategorised.length) grouped.push({ category: 'Other', items: uncategorised })

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .quote-print-root, .quote-print-root * { visibility: visible !important; }
          .quote-print-root { position: fixed !important; inset: 0 !important; z-index: 9999 !important; background: white !important; overflow: visible !important; padding: 32px !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="fixed inset-0 z-[60] overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="no-print sticky top-0 z-[70] flex items-center justify-between px-6 py-3" style={{ backgroundColor: '#161A18', borderBottom: '1px solid #2A2F2D' }}>
          <span className="text-sm font-semibold text-white">{job.job_id} — R{revision}</span>
          <div className="flex items-center gap-3">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#B89763' }}>
              <PrinterIcon size={14} />Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10"><XIcon size={18} style={{ color: '#9CA3AF' }} /></button>
          </div>
        </div>
        <div className="quote-print-root w-full max-w-3xl mx-auto mt-6 mb-12 bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="px-10 pt-10 pb-6" style={{ borderBottom: '2px solid #F3F4F6' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-2xl font-bold" style={{ color: '#1D211F' }}>Quote</p>
                <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold" style={{ color: '#B89763' }}>{job.job_id}</p>
                <p className="text-sm font-semibold" style={{ color: '#9CA3AF' }}>Revision R{revision}</p>
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Prepared for</p>
              <p className="text-base font-semibold" style={{ color: '#1D211F' }}>{job.customer_name}</p>
              {job.phone && <p className="text-sm" style={{ color: '#6B7280' }}>{job.phone}</p>}
              {job.email && <p className="text-sm" style={{ color: '#6B7280' }}>{job.email}</p>}
              {job.postcode && <p className="text-sm" style={{ color: '#6B7280' }}>{job.postcode}</p>}
            </div>
          </div>
          <div className="px-10 py-6">
            {grouped.map(({ category, items }) => (
              <div key={category} className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider mb-3 pb-1" style={{ color: '#B89763', borderBottom: '1px solid #F3F4F6' }}>{category}</p>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {items.map(({ line, idx }) => {
                      const retail = parseNum(line.retail_price)
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #F9FAFB' }}>
                          <td className="py-2 pr-4" style={{ color: '#1D211F' }}>{line.description || <span style={{ color: '#D1D5DB' }}>—</span>}</td>
                          <td className="py-2 text-right font-medium" style={{ color: '#374151' }}>{retail > 0 ? `£${fmt(retail)}` : '—'}</td>
                          <td className="no-print py-2 pl-4 text-center" style={{ width: '60px' }}>
                            <button onClick={() => onToggleOrdered(idx)} className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all"
                              style={{ borderColor: line.is_ordered ? '#059669' : '#D1D5DB', backgroundColor: line.is_ordered ? '#059669' : 'transparent' }}>
                              {line.is_ordered && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ))}
            {lines.length === 0 && <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No line items</p>}

            {totalRetail > 0 && (
              <div className="mt-4 ml-auto w-56">
                <div className="flex justify-between py-2" style={{ borderTop: '2px solid #1D211F' }}>
                  <span className="text-sm font-bold" style={{ color: '#1D211F' }}>Total</span>
                  <span className="text-sm font-bold" style={{ color: '#1D211F' }}>£{fmt(totalRetail)}</span>
                </div>
              </div>
            )}

            {lines.length > 0 && (
              <div className="no-print mt-6 rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
                <div className="px-4 py-2" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Internal — not printed</span>
                </div>
                {[
                  { label: 'Total Retail', value: totalRetail, color: '#1D211F' },
                  { label: 'Total Cost', value: totalCost, color: '#6B7280' },
                  { label: 'Gross Margin', value: totalMargin, color: totalMargin >= 0 ? '#059669' : '#DC2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{label}</span>
                    <span className="text-sm font-bold" style={{ color }}>£{fmt(value)}</span>
                  </div>
                ))}
                {totalRetail > 0 && (
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Margin %</span>
                    <span className="text-sm font-bold" style={{ color: totalMargin >= 0 ? '#059669' : '#DC2626' }}>{((totalMargin / totalRetail) * 100).toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main QuoteTab ────────────────────────────────────────────────────────────

export default function QuoteTab({ job }: { job: Job }) {
  const [lines, setLines] = useState<LineItem[]>([])
  const [revisions, setRevisions] = useState<number[]>([1])
  const [activeRevision, setActiveRevision] = useState<number>(1)
  const [latestRevision, setLatestRevision] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [creatingRevision, setCreatingRevision] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [fullScreen, setFullScreen] = useState(false)
  const [showPoP, setShowPoP] = useState(false)

  const loadRevision = async (revNum: number) => {
    setLoading(true)
    const { lines: fetched } = await getQuoteLines(job.id, revNum)
    setLines(fetched.map((l) => ({
      category: (l.category as LineItem['category']) ?? null,
      description: l.description,
      retail_price: l.retail_price?.toString() ?? '',
      cost_price: l.cost_price?.toString() ?? '',
      is_ordered: l.is_ordered ?? false,
    })))
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const [revNums, { lines: fetched, revision }] = await Promise.all([
        getQuoteRevisionNumbers(job.id),
        getQuoteLines(job.id),
      ])
      const latest = Math.max(...revNums, revision ?? 1)
      setRevisions(revNums.length > 0 ? revNums : [1])
      setLatestRevision(latest)
      setActiveRevision(latest)
      setLines(fetched.map((l) => ({
        category: (l.category as LineItem['category']) ?? null,
        description: l.description,
        retail_price: l.retail_price?.toString() ?? '',
        cost_price: l.cost_price?.toString() ?? '',
        is_ordered: l.is_ordered ?? false,
      })))
      setLoading(false)
    }
    init()
  }, [job.id])

  const switchRevision = async (rev: number) => {
    setActiveRevision(rev)
    await loadRevision(rev)
  }

  const handleCreateRevision = async () => {
    setCreatingRevision(true)
    const result = await createQuoteRevision(job.id)
    if (result.error) {
      setError(result.error)
    } else {
      const newRev = result.revision!
      setRevisions((prev) => [...prev.filter((r) => r !== newRev), newRev].sort((a, b) => a - b))
      setLatestRevision(newRev)
      setActiveRevision(newRev)
      await loadRevision(newRev)
    }
    setCreatingRevision(false)
  }

  const addLine = () =>
    setLines((prev) => [...prev, { category: null, description: '', retail_price: '', cost_price: '', is_ordered: false }])

  const update = (i: number, field: keyof LineItem, value: string | boolean | null) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)))

  const remove = (i: number) =>
    setLines((prev) => prev.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await saveQuoteLines(job.id, activeRevision, lines.map((l) => ({
      category: l.category ?? null,
      description: l.description,
      retail_price: l.retail_price ? parseFloat(l.retail_price) : null,
      cost_price: l.cost_price ? parseFloat(l.cost_price) : null,
      is_ordered: l.is_ordered,
    })))
    if (result.error) {
      setError(result.error)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
    setSaving(false)
  }

  const totalRetail = lines.reduce((s, l) => s + parseNum(l.retail_price), 0)
  const totalCost = lines.reduce((s, l) => s + parseNum(l.cost_price), 0)
  const totalMargin = totalRetail - totalCost
  const isLatest = activeRevision === latestRevision
  const isArchived = job.stage === 'archived'

  // Group lines by category for display
  type GroupedSection = { category: string | null; items: { line: LineItem; idx: number }[] }
  const buildGroups = (): GroupedSection[] => {
    const catMap: Record<string, { line: LineItem; idx: number }[]> = {}
    const uncategorised: { line: LineItem; idx: number }[] = []
    lines.forEach((line, idx) => {
      if (line.category) {
        if (!catMap[line.category]) catMap[line.category] = []
        catMap[line.category].push({ line, idx })
      } else {
        uncategorised.push({ line, idx })
      }
    })
    const result: GroupedSection[] = []
    QUOTE_CATEGORIES.forEach((cat) => {
      if (catMap[cat]?.length) result.push({ category: cat, items: catMap[cat] })
    })
    if (uncategorised.length) result.push({ category: null, items: uncategorised })
    return result
  }
  const groups = buildGroups()

  return (
    <>
      {fullScreen && (
        <FullScreenQuote
          job={job}
          lines={lines}
          revision={activeRevision}
          onClose={() => setFullScreen(false)}
          onToggleOrdered={(i) => update(i, 'is_ordered', !lines[i].is_ordered)}
        />
      )}
      {showPoP && (
        <ProofOfPurchase job={job} lines={lines} onClose={() => setShowPoP(false)} />
      )}

      <div className="flex flex-col flex-1 min-h-0">
        {/* Revision bar */}
        <div className="flex-none flex items-center justify-between px-6 py-2 gap-2" style={{ borderBottom: '1px solid #F3F4F6', backgroundColor: '#FAFAFA' }}>
          <div className="flex items-center gap-1 flex-wrap">
            {revisions.map((r) => (
              <button key={r} onClick={() => switchRevision(r)} className="px-2.5 py-1 rounded text-xs font-semibold transition-colors"
                style={{ backgroundColor: activeRevision === r ? '#1D211F' : '#F3F4F6', color: activeRevision === r ? '#FFFFFF' : '#6B7280' }}>
                R{r}{r === latestRevision ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {isArchived && (
              <button onClick={() => setShowPoP(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold hover:opacity-80 flex-none"
                style={{ backgroundColor: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0' }}>
                <PrinterIcon size={11} />Proof of Purchase
              </button>
            )}
            <button onClick={handleCreateRevision} disabled={creatingRevision}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 flex-none"
              style={{ backgroundColor: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' }}>
              <CopyPlusIcon size={11} />
              {creatingRevision ? 'Creating...' : 'New revision'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-sm" style={{ color: '#9CA3AF' }}>Loading...</div>
        ) : (
          <>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Quote header card */}
              <div className="rounded-lg p-4 space-y-1" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#B89763' }}>Quote</span>
                    {!isLatest && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                        Viewing R{activeRevision} — read only
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: '#6B7280' }}>{job.job_id} R{activeRevision}</span>
                    <button onClick={() => setFullScreen(true)} className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium hover:bg-gray-200"
                      style={{ backgroundColor: '#E5E7EB', color: '#374151' }}>
                      <Maximize2Icon size={11} />Full screen
                    </button>
                  </div>
                </div>
                <p className="text-sm font-semibold" style={{ color: '#1D211F' }}>{job.customer_name}</p>
                {job.phone && <p className="text-xs" style={{ color: '#6B7280' }}>{job.phone}</p>}
                {job.email && <p className="text-xs" style={{ color: '#6B7280' }}>{job.email}</p>}
                {job.postcode && <p className="text-xs" style={{ color: '#6B7280' }}>{job.postcode}</p>}
                <p className="text-xs pt-1" style={{ color: '#9CA3AF' }}>
                  {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Column headers */}
              <div className="flex items-center gap-1 mb-1">
                <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: '120px 1fr 110px 110px 90px 28px' }}>
                  <span style={LABEL_STYLE}>Category</span>
                  <span style={LABEL_STYLE}>Description</span>
                  <span style={{ ...LABEL_STYLE, textAlign: 'right' }}>Retail</span>
                  <span style={{ ...LABEL_STYLE, textAlign: 'right' }}>Cost</span>
                  <span style={{ ...LABEL_STYLE, textAlign: 'right' }}>Margin</span>
                  <span style={{ ...LABEL_STYLE, textAlign: 'center' }}>✓</span>
                </div>
                {isLatest && <div style={{ width: '24px', flexShrink: 0 }} />}
              </div>

              {/* Line items — flat list with category selector */}
              <div className="space-y-1.5">
                {lines.map((line, i) => {
                  const retail = parseNum(line.retail_price)
                  const cost = parseNum(line.cost_price)
                  const margin = retail - cost
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <div className="grid gap-1 flex-1" style={{ gridTemplateColumns: '120px 1fr 110px 110px 90px 28px' }}>
                        <select
                          className={INPUT}
                          style={{ ...INPUT_STYLE, cursor: isLatest ? 'pointer' : 'default', fontSize: '11px' }}
                          value={line.category ?? ''}
                          onChange={(e) => isLatest && update(i, 'category', e.target.value || null)}
                          disabled={!isLatest}
                        >
                          <option value="">—</option>
                          {QUOTE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input className={INPUT} style={INPUT_STYLE} placeholder="Item description"
                          value={line.description} onChange={(e) => isLatest && update(i, 'description', e.target.value)} readOnly={!isLatest} />
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9CA3AF' }}>£</span>
                          <input type="number" className={INPUT} style={{ ...INPUT_STYLE, paddingLeft: '16px' }} placeholder="0"
                            value={line.retail_price} onChange={(e) => isLatest && update(i, 'retail_price', e.target.value)} readOnly={!isLatest} min="0" step="0.01" />
                        </div>
                        <div className="relative">
                          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: '#9CA3AF' }}>£</span>
                          <input type="number" className={INPUT} style={{ ...INPUT_STYLE, paddingLeft: '16px' }} placeholder="0"
                            value={line.cost_price} onChange={(e) => isLatest && update(i, 'cost_price', e.target.value)} readOnly={!isLatest} min="0" step="0.01" />
                        </div>
                        <div className="flex items-center justify-end px-1.5 rounded text-xs font-medium"
                          style={{ backgroundColor: margin > 0 ? '#ECFDF5' : margin < 0 ? '#FEF2F2' : '#F9FAFB', border: '1px solid #E5E7EB', color: margin > 0 ? '#059669' : margin < 0 ? '#DC2626' : '#9CA3AF' }}>
                          £{fmt(margin)}
                        </div>
                        <button onClick={() => update(i, 'is_ordered', !line.is_ordered)}
                          className="flex items-center justify-center rounded-full border-2 transition-all w-6 h-6 mx-auto"
                          style={{ borderColor: line.is_ordered ? '#059669' : '#D1D5DB', backgroundColor: line.is_ordered ? '#059669' : 'transparent' }}>
                          {line.is_ordered && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>
                      </div>
                      {isLatest && (
                        <button onClick={() => remove(i)} className="flex-none p-1 rounded hover:bg-red-50">
                          <Trash2Icon size={13} style={{ color: '#D1D5DB' }} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {isLatest && (
                <button onClick={addLine} className="mt-1 flex items-center gap-1.5 text-xs font-medium hover:opacity-80" style={{ color: '#B89763' }}>
                  <PlusIcon size={13} />Add line item
                </button>
              )}

              {/* Category subheading preview (read-only grouped view below the flat list) */}
              {groups.length > 1 && (
                <div className="rounded-lg overflow-hidden mt-4" style={{ border: '1px solid #E5E7EB' }}>
                  <div className="px-4 py-2" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Grouped summary</span>
                  </div>
                  {groups.map(({ category, items }) => {
                    const catTotal = items.reduce((s, { line }) => s + parseNum(line.retail_price), 0)
                    return (
                      <div key={category ?? 'other'} className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <span className="text-xs font-semibold" style={{ color: '#374151' }}>{category ?? 'Uncategorised'}</span>
                        <span className="text-xs font-bold" style={{ color: '#1D211F' }}>£{fmt(catTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Totals */}
              {lines.length > 0 && (
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
                  {[
                    { label: 'Total Retail', value: totalRetail, color: '#1D211F' },
                    { label: 'Total Cost', value: totalCost, color: '#6B7280' },
                    { label: 'Gross Margin', value: totalMargin, color: totalMargin >= 0 ? '#059669' : '#DC2626' },
                  ].map(({ label, value, color }, idx, arr) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5"
                      style={{ borderBottom: idx < arr.length - 1 ? '1px solid #F3F4F6' : undefined, backgroundColor: idx === arr.length - 1 ? '#F9FAFB' : '#FFFFFF' }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>£{fmt(value)}</span>
                    </div>
                  ))}
                  {totalRetail > 0 && (
                    <div className="flex items-center justify-between px-4 py-2" style={{ backgroundColor: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Margin %</span>
                      <span className="text-sm font-bold" style={{ color: totalMargin >= 0 ? '#059669' : '#DC2626' }}>{((totalMargin / totalRetail) * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-none px-6 py-4 flex items-center gap-3" style={{ borderTop: '1px solid #F3F4F6' }}>
              {error && <p className="text-xs flex-1" style={{ color: '#DC2626' }}>{error}</p>}
              {saved && <p className="text-xs flex-1" style={{ color: '#059669' }}>Saved!</p>}
              {!error && !saved && <div className="flex-1" />}
              {isLatest ? (
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: '#B89763' }}>
                  <SaveIcon size={14} />
                  {saving ? 'Saving...' : 'Save Quote'}
                </button>
              ) : (
                <p className="text-xs" style={{ color: '#9CA3AF' }}>Switch to R{latestRevision} to edit</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
