'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const RANGES = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

export default function DateRangePicker({
  basePath,
  currentRange,
  currentFrom,
  currentTo,
}: {
  basePath: string
  currentRange: string
  currentFrom?: string
  currentTo?: string
}) {
  const router = useRouter()
  const [showCustom, setShowCustom] = useState(false)
  const [fromDate, setFromDate] = useState(currentFrom ?? '')
  const [toDate, setToDate] = useState(currentTo ?? '')

  const handleRangeChange = (range: string) => {
    setShowCustom(false)
    router.push(`${basePath}?range=${range}`)
  }

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return
    router.push(`${basePath}?from=${fromDate}&to=${toDate}`)
    setShowCustom(false)
  }

  const isCustomActive = !!currentFrom && !!currentTo

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: '#252B28' }}>
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => handleRangeChange(r.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={
              !isCustomActive && currentRange === r.key
                ? { backgroundColor: '#B89763', color: '#FFFFFF' }
                : { color: '#6B7280' }
            }
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => setShowCustom((v) => !v)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={
            isCustomActive || showCustom
              ? { backgroundColor: '#B89763', color: '#FFFFFF' }
              : { color: '#6B7280' }
          }
        >
          Custom
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: '#252B28' }}>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-xs text-white outline-none"
            style={{ backgroundColor: '#1D211F', border: '1px solid #3A403D' }}
          />
          <span className="text-xs" style={{ color: '#6B7280' }}>to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg px-2 py-1.5 text-xs text-white outline-none"
            style={{ backgroundColor: '#1D211F', border: '1px solid #3A403D' }}
          />
          <button
            onClick={handleCustomApply}
            disabled={!fromDate || !toDate}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#B89763' }}
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
