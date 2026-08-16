'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { BoardKey } from '@/types'

interface DashboardViewProps {
  rangeLabel: string
  currentRange: string
  currentFrom?: string
  currentTo?: string
  periodEnquiries: number
  periodQualified: number
  periodDead: number
  conversionRate: number | null
  salesAgreed: number
  aov: number | null
  cpl: number | null
  cpa: number | null
  cvr: number | null
  cvrSalesCount: number
  grossMarginPct: number | null
  grossMarginJobCount: number
  projectedPipeline: number
  stageCounts: Partial<Record<BoardKey, number>>
  totalJobs: number
  hasMarketingSpend: boolean
}

const RANGES = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'year', label: 'This year' },
  { key: 'all', label: 'All time' },
]

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2"
      style={{ backgroundColor: '#252B28' }}
    >
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold"
        style={{ color: accent ? '#B89763' : '#FFFFFF' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs" style={{ color: '#6B7280' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function fmt(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function DashboardView({
  rangeLabel,
  currentRange,
  currentFrom,
  currentTo,
  periodEnquiries,
  periodQualified,
  periodDead,
  conversionRate,
  salesAgreed,
  aov,
  cpl,
  cpa,
  cvr,
  cvrSalesCount,
  grossMarginPct,
  grossMarginJobCount,
  projectedPipeline,
  stageCounts,
  totalJobs,
  hasMarketingSpend,
}: DashboardViewProps) {
  const router = useRouter()
  const [showCustom, setShowCustom] = useState(false)
  const [fromDate, setFromDate] = useState(currentFrom ?? '')
  const [toDate, setToDate] = useState(currentTo ?? '')

  const handleRangeChange = (range: string) => {
    setShowCustom(false)
    router.push(`/dashboard?range=${range}`)
  }

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return
    router.push(`/dashboard?from=${fromDate}&to=${toDate}`)
    setShowCustom(false)
  }

  const isCustomActive = !!currentFrom && !!currentTo

  const pipelineTotal =
    (stageCounts.enquiries ?? 0) +
    (stageCounts.qualified_leads ?? 0) +
    (stageCounts.order_processing ?? 0) +
    (stageCounts.project_management ?? 0)

  return (
    <div className="px-8 py-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Showing data for: <span style={{ color: '#B89763' }}>{rangeLabel}</span>
          </p>
        </div>

        {/* Date range selector */}
        <div className="flex flex-col items-end gap-2">
          <div
            className="flex gap-1 p-1 rounded-xl"
            style={{ backgroundColor: '#252B28' }}
          >
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
            <div
              className="flex items-center gap-2 p-3 rounded-xl"
              style={{ backgroundColor: '#252B28' }}
            >
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
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Enquiries"
          value={String(periodEnquiries)}
          sub={`${rangeLabel}`}
        />
        <StatCard
          label="Qualified"
          value={String(periodQualified)}
          sub={`of ${periodEnquiries} enquiries`}
        />
        <StatCard
          label="Dead Leads"
          value={String(periodDead)}
          sub="Sent to archive"
        />
        <StatCard
          label="Active Pipeline"
          value={String(pipelineTotal)}
          sub={`${totalJobs} total jobs`}
        />
      </div>

      {/* Financial metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Sales Agreed"
          value={salesAgreed > 0 ? fmt(salesAgreed) : '£0'}
          sub="Sum of order valuations"
          accent
        />
        <StatCard
          label="AOV"
          value={aov !== null ? fmt(aov) : '—'}
          sub={aov !== null ? 'Average order value' : 'No sales this period'}
          accent={aov !== null}
        />
        <StatCard
          label="CVR"
          value={cvr !== null ? `${cvr}%` : '—'}
          sub={cvr !== null ? `${cvrSalesCount} of ${periodQualified} qualified` : 'No qualified leads this period'}
          accent={cvr !== null}
        />
        <StatCard
          label="Gross Margin %"
          value={grossMarginPct !== null ? `${grossMarginPct}%` : '—'}
          sub={
            grossMarginPct !== null
              ? `Avg across ${grossMarginJobCount} PM job${grossMarginJobCount !== 1 ? 's' : ''}`
              : 'Add cost prices to quotes'
          }
          accent={grossMarginPct !== null}
        />
        <div
          className="rounded-xl p-5 flex flex-col gap-2"
          style={{ backgroundColor: '#252B28' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
            CPL / CPA
          </p>
          {!hasMarketingSpend ? (
            <>
              <p className="text-xl font-bold" style={{ color: '#4A5250' }}>—</p>
              <Link
                href="/marketing"
                className="text-xs underline underline-offset-2"
                style={{ color: '#B89763' }}
              >
                Add marketing spend →
              </Link>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold" style={{ color: cpl !== null ? '#B89763' : '#4A5250' }}>
                    {cpl !== null ? fmt(cpl) : '—'}
                  </span>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>CPL</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold" style={{ color: cpa !== null ? '#B89763' : '#4A5250' }}>
                    {cpa !== null ? fmt(cpa) : '—'}
                  </span>
                  <span className="text-xs font-semibold uppercase" style={{ color: '#6B7280' }}>CPA</span>
                </div>
              </div>
              <Link href="/marketing" className="text-xs" style={{ color: '#4A5250' }}>
                Manage spend →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Conversion Rate */}
        <div className="rounded-xl p-6" style={{ backgroundColor: '#252B28' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6B7280' }}>
            Enquiry → Qualified Conversion Rate
          </p>
          <div className="flex items-end gap-4 mb-4">
            <p className="text-5xl font-bold" style={{ color: '#B89763' }}>
              {conversionRate !== null ? `${conversionRate}%` : '—'}
            </p>
            {conversionRate !== null && (
              <p className="text-sm pb-1" style={{ color: '#6B7280' }}>
                {periodQualified} of {periodQualified + periodDead} decided
              </p>
            )}
          </div>
          {conversionRate !== null ? (
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${conversionRate}%`,
                  backgroundColor: conversionRate >= 50 ? '#10B981' : conversionRate >= 25 ? '#F59E0B' : '#EF4444',
                }}
              />
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#4A5250' }}>
              Mark enquiries as Qualified or Dead to see conversion rate
            </p>
          )}
        </div>

        {/* Projected Forward Sales Pipeline */}
        <div className="rounded-xl p-6" style={{ backgroundColor: '#252B28' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#6B7280' }}>
            Projected Forward Sales Pipeline
          </p>
          <p className="text-xs mb-4" style={{ color: '#4A5250' }}>
            Sum of budget × historical close rate for all current qualified leads
          </p>
          <p className="text-5xl font-bold mb-2" style={{ color: '#B89763' }}>
            {projectedPipeline > 0
              ? `£${Math.round(projectedPipeline).toLocaleString('en-GB')}`
              : '—'}
          </p>
          {projectedPipeline === 0 && (
            <p className="text-xs" style={{ color: '#4A5250' }}>
              Appears once qualified leads have a budget and enough historical data exists per source
            </p>
          )}
        </div>
      </div>

      {/* Pipeline breakdown */}
      <div className="rounded-xl p-6" style={{ backgroundColor: '#252B28' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#6B7280' }}>
          Current Pipeline
        </p>
        <div className="space-y-3">
          {[
            { label: 'Enquiries', count: stageCounts.enquiries ?? 0, color: '#3B82F6' },
            { label: 'Qualified Leads', count: stageCounts.qualified_leads ?? 0, color: '#8B5CF6' },
            { label: 'Order Processing', count: stageCounts.order_processing ?? 0, color: '#F59E0B' },
            { label: 'Project Management', count: stageCounts.project_management ?? 0, color: '#10B981' },
            { label: 'Dead Leads', count: stageCounts.dead_leads ?? 0, color: '#EF4444' },
            { label: 'Finished', count: stageCounts.finished ?? 0, color: '#6B7280' },
          ].map((row) => (
            <div key={row.label} className="flex items-center gap-4">
              <div className="flex items-center gap-2 w-48">
                <div className="w-2.5 h-2.5 rounded-full flex-none" style={{ backgroundColor: row.color }} />
                <span className="text-sm" style={{ color: '#9CA3AF' }}>{row.label}</span>
              </div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#1D211F' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: totalJobs > 0 ? `${(row.count / totalJobs) * 100}%` : '0%',
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="text-sm font-semibold text-white w-8 text-right">{row.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
