'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { getSnagItems, addSnagItem, toggleSnagItem, deleteSnagItem } from '@/lib/actions'
import type { SnagItem } from '@/types'

const INPUT = 'w-full rounded-lg px-3 py-2 text-sm outline-none'
const INPUT_STYLE: React.CSSProperties = { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1D211F' }

// Outstanding (not-done) snag items feed the To-Do board, so they're
// worth completing there too — see components/todo/TodoView.tsx.
export default function SnagChecklist({ jobId, legacyNote }: { jobId: string; legacyNote?: string | null }) {
  const [items, setItems] = useState<SnagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newDescription, setNewDescription] = useState('')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    let cancelled = false
    getSnagItems(jobId).then((fetched) => {
      if (!cancelled) {
        setItems(fetched)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [jobId])

  const handleAdd = async () => {
    if (!newDescription.trim()) return
    setAdding(true)
    const result = await addSnagItem(jobId, newDescription.trim())
    if (!result.error && result.item) {
      setItems((prev) => [...prev, result.item as SnagItem])
      setNewDescription('')
    }
    setAdding(false)
  }

  const handleToggle = async (item: SnagItem) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i)))
    await toggleSnagItem(item.id, !item.is_done)
  }

  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    await deleteSnagItem(id)
  }

  const outstanding = items.filter((i) => !i.is_done).length

  return (
    <div>
      {legacyNote && (
        <div className="mb-2 rounded-lg px-3 py-2 text-sm" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>Previous notes</p>
          <p className="whitespace-pre-wrap">{legacyNote}</p>
        </div>
      )}

      {loading ? (
        <p className="text-xs" style={{ color: '#9CA3AF' }}>Loading...</p>
      ) : (
        <>
          {items.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-lg px-2.5 py-1.5" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <input
                    type="checkbox"
                    checked={item.is_done}
                    onChange={() => handleToggle(item)}
                    className="w-4 h-4 rounded flex-none"
                    style={{ accentColor: '#B89763' }}
                  />
                  <span
                    className="flex-1 text-sm"
                    style={{ color: item.is_done ? '#9CA3AF' : '#374151', textDecoration: item.is_done ? 'line-through' : 'none' }}
                  >
                    {item.description}
                  </span>
                  <button onClick={() => handleDelete(item.id)} className="flex-none p-1 rounded hover:bg-red-50">
                    <Trash2Icon size={13} style={{ color: '#D1D5DB' }} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
              placeholder="Add a snag or outstanding item..."
              className={INPUT}
              style={{ ...INPUT_STYLE, flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || !newDescription.trim()}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50 flex-none"
              style={{ backgroundColor: '#B89763' }}
            >
              <PlusIcon size={13} />Add
            </button>
          </div>

          {items.length === 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>No snags — add anything outstanding above.</p>
          )}
          {outstanding > 0 && (
            <p className="text-xs mt-1.5" style={{ color: '#B45309' }}>
              {outstanding} outstanding — also listed on the To-Do board.
            </p>
          )}
        </>
      )}
    </div>
  )
}
