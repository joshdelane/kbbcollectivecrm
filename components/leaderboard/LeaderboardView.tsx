'use client'

import { useState, useMemo } from 'react'
import { TrophyIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react'
import DateRangePicker from '@/components/shared/DateRangePicker'
import type { DesignerStats } from '@/types'

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

type SortKey = 'totalSales' | 'dealsWon' | 'aov' | 'grossMarginPct' | 'conversionRate'
type SortDir = 'asc' | 'desc'

const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32']

const TH = ({ children, sortKey, sort, onSort, align = 'right' }: {
  children: React.ReactNode
  sortKey: SortKey
  sort: { key: SortKey; dir: SortDir }
  onSort: (key: SortKey) => void
  align?: 'left' | 'right'
}) => (
  <th
    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none ${align === 'right' ? 'text-right' : 'text-left'}`}
    style={{ color: sort.key === sortKey ? '#D1D5DB' : '#6B7280' }}
    onClick={() => onSort(sortKey)}
  >
    <span className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
      {children}
      {sort.key === sortKey && (sort.dir === 'asc' ? <ChevronUpIcon size={10} /> : <ChevronDownIcon size={10} />)}
    </span>
  </th>
)

export default function LeaderboardView({
  designers,
  rangeLabel,
  currentRange,
  currentFrom,
  currentTo,
}: {
  designers: DesignerStats[]
  rangeLabel: string
  currentRange: string
  currentFrom?: string
  currentTo?: string
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({ key: 'totalSales', dir: 'desc' })

  const handleSort = (key: SortKey) =>
    setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))

  const sorted = useMemo(() => {
    const list = [...designers]
    list.sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      // nulls (no data for that metric in this period) always sink to the bottom
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      return sort.dir === 'asc' ? va - vb : vb - va
    })
    return list
  }, [designers, sort])

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <TrophyIcon size={22} style={{ color: '#B89763' }} />
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Showing data for: <span style={{ color: '#B89763' }}>{rangeLabel}</span>
            </p>
          </div>
        </div>
        <DateRangePicker basePath="/leaderboard" currentRange={currentRange} currentFrom={currentFrom} currentTo={currentTo} />
      </div>

      {designers.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center py-20" style={{ border: '1px solid #252B28' }}>
          <p className="text-sm font-medium text-white">No designers yet</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Assign a designer to a job to see them ranked here.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252B28' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr style={{ backgroundColor: '#1E2422' }}>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: '#6B7280', width: '48px' }}>#</th>
                  <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-left" style={{ color: '#6B7280' }}>Designer</th>
                  <TH sortKey="totalSales" sort={sort} onSort={handleSort}>Total Sales</TH>
                  <TH sortKey="dealsWon" sort={sort} onSort={handleSort}>Deals Won</TH>
                  <TH sortKey="aov" sort={sort} onSort={handleSort}>AOV</TH>
                  <TH sortKey="grossMarginPct" sort={sort} onSort={handleSort}>Margin %</TH>
                  <TH sortKey="conversionRate" sort={sort} onSort={handleSort}>Win Rate</TH>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d, i) => (
                  <tr key={d.profileId} style={{ borderTop: '1px solid #252B28' }}>
                    <td className="px-4 py-3">
                      {i < 3 ? (
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: RANK_COLORS[i] + '22', color: RANK_COLORS[i] }}
                        >
                          {i + 1}
                        </span>
                      ) : (
                        <span className="text-xs pl-2" style={{ color: '#4A5250' }}>{i + 1}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-none"
                          style={{ backgroundColor: '#B89763' }}
                        >
                          {d.fullName.charAt(0).toUpperCase()}
                        </span>
                        <span className="text-sm font-semibold text-white">{d.fullName}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-bold" style={{ color: d.totalSales > 0 ? '#B89763' : '#4A5250' }}>
                        {d.totalSales > 0 ? fmt(d.totalSales) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm" style={{ color: '#D1D5DB' }}>{d.dealsWon}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm" style={{ color: d.aov !== null ? '#D1D5DB' : '#4A5250' }}>
                        {d.aov !== null ? fmt(d.aov) : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.grossMarginPct !== null ? (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: d.grossMarginPct >= 0 ? '#05402022' : '#3B151522', color: d.grossMarginPct >= 0 ? '#10B981' : '#EF4444' }}>
                          {d.grossMarginPct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#4A5250' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {d.conversionRate !== null ? (
                        <span className="flex items-center justify-end gap-2">
                          <span className="text-sm font-semibold" style={{ color: d.conversionRate >= 60 ? '#10B981' : d.conversionRate >= 40 ? '#F59E0B' : '#EF4444' }}>
                            {Math.round(d.conversionRate)}%
                          </span>
                          <span className="text-xs" style={{ color: '#4A5250' }}>({d.wonCount}/{d.wonCount + d.lostCount})</span>
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: '#4A5250' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
