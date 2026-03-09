'use client'

import { useRouter } from 'next/navigation'
import type { Stage } from '@/types'

interface DashboardViewProps {
  rangeLabel: string
  currentRange: string
  periodEnquiries: number
  periodQualified: number
  periodDead: number
  conversionRate: number | null
  salesAgreed: number
  projectedPipeline: number
  stageCounts: Partial<Record<Stage, number>>
  totalJobs: number
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

export default function DashboardView({
  rangeLabel,
  currentRange,
  periodEnquiries,
  periodQualified,
  periodDead,
  conversionRate,
  salesAgreed,
  projectedPipeline,
  stageCounts,
  totalJobs,
}: DashboardViewProps) {
  const router = useRouter()

  const handleRangeChange = (range: string) => {
    router.push(`/dashboard?range=${range}`)
  }

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
                currentRange === r.key
                  ? { backgroundColor: '#B89763', color: '#FFFFFF' }
                  : { color: '#6B7280' }
              }
            >
              {r.label}
            </button>
          ))}
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

        {/* Sales Agreed */}
        <div className="rounded-xl p-6" style={{ backgroundColor: '#252B28' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#6B7280' }}>
            Sales Agreed
          </p>
          <p className="text-5xl font-bold mb-2" style={{ color: '#B89763' }}>
            {salesAgreed > 0
              ? `£${salesAgreed.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
              : '£0'}
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            Sum of order valuations for this period
          </p>
        </div>
      </div>

      {/* Projected Forward Sales Pipeline */}
      <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: '#252B28' }}>
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
            { label: 'Archived', count: stageCounts.archived ?? 0, color: '#6B7280' },
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
