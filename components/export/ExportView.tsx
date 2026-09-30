'use client'

import { useState } from 'react'
import { DownloadIcon, SearchIcon } from 'lucide-react'
import { exportJobsCsv } from '@/lib/actions'

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slugify(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return 'all-jobs'
  return trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function ExportView() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastCount, setLastCount] = useState<number | null>(null)

  const handleExport = async () => {
    setLoading(true)
    setError('')
    setLastCount(null)
    const result = await exportJobsCsv(query)
    if ('error' in result) {
      setError(result.error)
    } else if (result.count === 0) {
      setError('No jobs matched that search.')
    } else {
      const today = new Date().toISOString().slice(0, 10)
      downloadCsv(result.csv, `jobs-export-${slugify(query)}-${today}.csv`)
      setLastCount(result.count)
    }
    setLoading(false)
  }

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Export Jobs</h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Download a CSV with customer details, stage, source, value, deposit, dates, notes and quote — spanning every board.
        </p>
      </div>

      <div className="rounded-xl p-6" style={{ backgroundColor: '#252B28' }}>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
          Search by customer name, address, postcode or job ID
        </label>
        <div className="flex items-center gap-2 mb-1">
          <div className="relative flex-1">
            <SearchIcon size={14} style={{ color: '#6B7280', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleExport() }}
              placeholder="e.g. Hogwood House"
              className="w-full rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none"
              style={{ backgroundColor: '#1D211F', border: '1px solid #2A2F2D', color: '#FFFFFF' }}
            />
          </div>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex-none"
            style={{ backgroundColor: '#B89763' }}
          >
            <DownloadIcon size={14} />
            {loading ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        <p className="text-xs" style={{ color: '#4A5250' }}>
          Leave blank to export every job, across every stage — including Dead Leads and Finished.
        </p>

        {error && (
          <p className="text-sm mt-4" style={{ color: '#EF4444' }}>{error}</p>
        )}
        {lastCount !== null && (
          <p className="text-sm mt-4" style={{ color: '#10B981' }}>
            Downloaded {lastCount} job{lastCount !== 1 ? 's' : ''}.
          </p>
        )}
      </div>
    </div>
  )
}
