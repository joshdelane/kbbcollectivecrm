'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SearchIcon } from 'lucide-react'
import { searchJobs } from '@/lib/actions'
import type { BoardKey } from '@/types'

const STAGE_LABELS: Record<BoardKey, string> = {
  enquiries: 'Enquiries',
  qualified_leads: 'Qualified Leads',
  order_processing: 'Order Processing',
  project_management: 'Project Management',
  dead_leads: 'Dead Leads',
  finished: 'Finished',
}

const STAGE_COLORS: Record<BoardKey, string> = {
  enquiries: '#3B82F6',
  qualified_leads: '#8B5CF6',
  order_processing: '#F59E0B',
  project_management: '#10B981',
  dead_leads: '#EF4444',
  finished: '#6B7280',
}

type SearchResult = {
  id: string
  job_id: string
  customer_name: string
  board: BoardKey
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [isPending, startTransition] = useTransition()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const found = await searchJobs(query)
        setResults(found)
        setOpen(found.length > 0)
        setActiveIndex(-1)
      })
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const navigate = (result: SearchResult) => {
    setQuery('')
    setResults([])
    setOpen(false)
    router.push(`/board/${result.board}?open=${result.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      navigate(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={containerRef} className="relative px-3 pt-3 pb-2">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ backgroundColor: '#1D211F', border: '1px solid #2A2F2D' }}
      >
        <SearchIcon size={13} style={{ color: isPending ? '#B89763' : '#4A5250', flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search jobs…"
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
          style={{ color: '#FFFFFF' }}
        />
      </div>

      {open && results.length > 0 && (
        <div
          className="absolute left-3 right-3 top-full mt-1 rounded-lg overflow-hidden z-50"
          style={{ backgroundColor: '#252B28', border: '1px solid #3A4040', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}
        >
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r)}
              onMouseEnter={() => setActiveIndex(i)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
              style={{ backgroundColor: i === activeIndex ? '#1D211F' : 'transparent' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-none"
                style={{ backgroundColor: STAGE_COLORS[r.board] }}
              />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-white truncate">{r.customer_name}</span>
                <span className="block text-xs" style={{ color: '#6B7280' }}>
                  <span style={{ color: '#B89763' }}>{r.job_id}</span>
                  {' · '}
                  {STAGE_LABELS[r.board]}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
