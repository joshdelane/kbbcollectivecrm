'use client'

interface TodoLine {
  id: string
  job_id: string
  category: string | null
  description: string
  retail_price: number | null
  is_ordered: boolean
  revision_number: number
}

interface TodoJob {
  id: string
  job_id: string
  customer_name: string
  signed_off_install_date: string
}

interface JobWithLines {
  job: TodoJob
  lines: TodoLine[]
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(d: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

const CATEGORY_COLORS: Record<string, string> = {
  'Cabinetry': '#8B5CF6',
  'Appliances': '#3B82F6',
  'Sinks and Taps': '#06B6D4',
  'Worktops': '#F59E0B',
  'Installation': '#10B981',
}

export default function TodoView({ jobsWithLines }: { jobsWithLines: JobWithLines[] }) {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">To-Do</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Unordered items from jobs fitting within the next 12 weeks
        </p>
      </div>

      {jobsWithLines.length === 0 ? (
        <div className="rounded-xl flex flex-col items-center justify-center py-20" style={{ border: '1px solid #252B28' }}>
          <p className="text-sm font-medium text-white">All clear</p>
          <p className="text-xs mt-1" style={{ color: '#6B7280' }}>No unordered items for upcoming installs.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobsWithLines.map(({ job, lines }) => {
            const days = daysUntil(job.signed_off_install_date)
            const urgentColor = days <= 14 ? '#EF4444' : days <= 28 ? '#F59E0B' : '#10B981'

            // Group lines by category
            const catMap: Record<string, TodoLine[]> = {}
            const uncategorised: TodoLine[] = []
            lines.forEach((l) => {
              if (l.category) {
                if (!catMap[l.category]) catMap[l.category] = []
                catMap[l.category].push(l)
              } else {
                uncategorised.push(l)
              }
            })

            return (
              <div key={job.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid #252B28' }}>
                {/* Job header */}
                <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: '#1E2422', borderBottom: '1px solid #252B28' }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: '#B89763' }}>{job.job_id}</span>
                    <span className="text-sm font-semibold text-white">{job.customer_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: '#6B7280' }}>
                      Install: {fmtDate(job.signed_off_install_date)}
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: urgentColor + '22', color: urgentColor }}>
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                    </span>
                  </div>
                </div>

                {/* Lines grouped by category */}
                <div className="divide-y" style={{ borderColor: '#252B28' }}>
                  {Object.entries(catMap).map(([cat, catLines]) => (
                    <div key={cat} className="px-5 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: CATEGORY_COLORS[cat] ?? '#9CA3AF' }}>{cat}</p>
                      <div className="space-y-1.5">
                        {catLines.map((line) => (
                          <div key={line.id} className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: '#D1D5DB' }}>{line.description}</span>
                            {line.retail_price != null && (
                              <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                                £{line.retail_price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {uncategorised.length > 0 && (
                    <div className="px-5 py-3">
                      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>Uncategorised</p>
                      <div className="space-y-1.5">
                        {uncategorised.map((line) => (
                          <div key={line.id} className="flex items-center justify-between">
                            <span className="text-sm" style={{ color: '#D1D5DB' }}>{line.description}</span>
                            {line.retail_price != null && (
                              <span className="text-xs font-medium" style={{ color: '#6B7280' }}>
                                £{line.retail_price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
