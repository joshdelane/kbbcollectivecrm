import type { Job, Profile } from '@/types'
import JobCard from './JobCard'

interface StageColumnProps {
  stage: { key: string; label: string; color: string }
  jobs: Job[]
  profiles: Profile[]
  onJobClick: (job: Job) => void
}

export default function StageColumn({ stage, jobs, profiles, onJobClick }: StageColumnProps) {
  return (
    <div className="flex-none flex flex-col" style={{ width: '288px', minWidth: '288px' }}>
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-xl"
        style={{ backgroundColor: '#252B28' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full flex-none"
            style={{ backgroundColor: stage.color }}
          />
          <h2 className="text-sm font-semibold text-white">{stage.label}</h2>
        </div>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: stage.color + '22',
            color: stage.color,
          }}
        >
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div
        className="flex-1 flex flex-col gap-2 p-2 rounded-b-xl overflow-y-auto"
        style={{
          backgroundColor: '#1E2422',
          minHeight: '120px',
          maxHeight: 'calc(100vh - 160px)',
        }}
      >
        {jobs.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <p className="text-xs" style={{ color: '#3A403D' }}>
              No items
            </p>
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              profiles={profiles}
              onClick={() => onJobClick(job)}
            />
          ))
        )}
      </div>
    </div>
  )
}
