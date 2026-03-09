'use client'

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'

export interface CalendarJob {
  id: string
  job_id: string
  customer_name: string
  signed_off_install_date: string
  fitting_days: number
  stage: string
  worktop_template_date: string | null
  worktop_install_date: string | null
}

interface InstallCalendarViewProps {
  jobs: CalendarJob[]
}

const STAGE_COLOR: Record<string, string> = {
  order_processing: '#F59E0B',
  project_management: '#10B981',
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Returns ISO date strings (YYYY-MM-DD) for all working days occupied by a job
function getJobWorkingDays(job: CalendarJob): Set<string> {
  const days = new Set<string>()
  const d = new Date(job.signed_off_install_date + 'T12:00:00')
  let added = 0
  while (added < job.fitting_days) {
    const dow = d.getDay()
    if (dow >= 1 && dow <= 5) {
      days.add(toISO(d))
      added++
    }
    d.setDate(d.getDate() + 1)
  }
  return days
}

// Returns the Monday of the week containing a given date
function getMonday(date: Date): Date {
  const d = new Date(date)
  const dow = d.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Returns week rows for a month, each row being Mon–Fri dates (null = outside current month)
function getWeeksForMonth(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const weeks: (Date | null)[][] = []
  const cursor = getMonday(firstDay)

  while (cursor <= lastDay) {
    const week: (Date | null)[] = []
    for (let i = 0; i < 5; i++) {
      const d = new Date(cursor)
      d.setDate(d.getDate() + i)
      week.push(d.getMonth() === month ? d : null)
    }
    if (week.some((d) => d !== null)) {
      weeks.push(week)
    }
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const todayISO = toISO(new Date())

export default function InstallCalendarView({ jobs }: InstallCalendarViewProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // Pre-compute working days per job (install bars)
  const jobDays = jobs.map((job) => ({
    job,
    days: getJobWorkingDays(job),
    color: STAGE_COLOR[job.stage] ?? '#B89763',
  }))

  // Single-day worktop events: [{jobId, job_id, customer_name, date, type}]
  type WorktopEvent = { id: string; job_id: string; customer_name: string; date: string; type: 'template' | 'install' }
  const worktopEvents: WorktopEvent[] = []
  jobs.forEach((job) => {
    if (job.worktop_template_date) worktopEvents.push({ id: job.id + '-wt', job_id: job.job_id, customer_name: job.customer_name, date: job.worktop_template_date, type: 'template' })
    if (job.worktop_install_date) worktopEvents.push({ id: job.id + '-wi', job_id: job.job_id, customer_name: job.customer_name, date: job.worktop_install_date, type: 'install' })
  })

  const weeks = getWeeksForMonth(year, month)

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Install Calendar</h1>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>Working days only (Mon–Fri)</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <ChevronLeftIcon size={18} style={{ color: '#9CA3AF' }} />
          </button>
          <span className="text-lg font-semibold text-white w-44 text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg transition-colors hover:bg-white/5">
            <ChevronRightIcon size={18} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-5">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#10B981' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Installation</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#8B5CF6' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Worktop Template</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: '#F59E0B' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>Worktop Install</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #252B28' }}>
        {/* Day header */}
        <div className="grid grid-cols-5" style={{ backgroundColor: '#1E2422', borderBottom: '1px solid #252B28' }}>
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: '#6B7280' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => {
          // Find jobs with days active in this week
          type Bar = { id: string; job_id: string; customer_name: string; color: string; start: number; end: number }
          const activeBars: Bar[] = jobDays.flatMap(({ job, days, color }) => {
            const indices = week
              .map((d, i) => (d && days.has(toISO(d)) ? i : -1))
              .filter((i) => i !== -1)
            if (indices.length === 0) return []
            return [{ id: job.id, job_id: job.job_id, customer_name: job.customer_name, color, start: indices[0], end: indices[indices.length - 1] }]
          })
          // Single-day worktop events for this week
          worktopEvents.forEach((ev) => {
            const colIdx = week.findIndex((d) => d && toISO(d) === ev.date)
            if (colIdx === -1) return
            activeBars.push({ id: ev.id, job_id: ev.job_id, customer_name: ev.customer_name, color: ev.type === 'template' ? '#8B5CF6' : '#F59E0B', start: colIdx, end: colIdx })
          })

          return (
            <div
              key={wi}
              style={{ borderBottom: wi < weeks.length - 1 ? '1px solid #252B28' : undefined }}
            >
              {/* Date row */}
              <div className="grid grid-cols-5">
                {week.map((d, di) => (
                  <div
                    key={di}
                    className="px-3 pt-2.5 pb-1"
                    style={{ borderRight: di < 4 ? '1px solid #252B28' : undefined }}
                  >
                    {d && (
                      <span
                        className={`text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full`}
                        style={
                          toISO(d) === todayISO
                            ? { backgroundColor: '#B89763', color: '#FFFFFF' }
                            : { color: '#4A5250' }
                        }
                      >
                        {d.getDate()}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Job bars */}
              {activeBars.length > 0 ? (
                <div className="px-1 pb-2 space-y-1">
                  {activeBars.map(({ id, job_id, customer_name, color, start, end }) => {
                    const leftPct = (start / 5) * 100
                    const widthPct = ((end - start + 1) / 5) * 100
                    return (
                      <div key={id} className="relative h-7">
                        <div
                          className="absolute inset-y-0 flex items-center px-2.5 rounded overflow-hidden"
                          style={{
                            left: `calc(${leftPct}% + 2px)`,
                            width: `calc(${widthPct}% - 4px)`,
                            backgroundColor: color + '28',
                            border: `1px solid ${color}55`,
                          }}
                        >
                          <span className="text-xs font-bold truncate mr-1.5" style={{ color }}>
                            {job_id}
                          </span>
                          <span className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                            {customer_name}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="h-2" />
              )}
            </div>
          )
        })}

        {weeks.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: '#4A5250' }}>
            No weeks found for this month.
          </div>
        )}
      </div>

      {/* No jobs notice */}
      {jobDays.length === 0 && (
        <p className="text-sm mt-6 text-center" style={{ color: '#4A5250' }}>
          No jobs with a signed-off install date and fitting days set.
        </p>
      )}
    </div>
  )
}
