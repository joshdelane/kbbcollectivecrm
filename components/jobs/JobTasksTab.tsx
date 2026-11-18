'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, Trash2Icon } from 'lucide-react'
import { getJobTasks, addJobTask, toggleJobTask, deleteJobTask } from '@/lib/actions'
import type { JobTask, Profile } from '@/types'

const INPUT = 'w-full rounded-lg px-3 py-2 text-sm outline-none'
const INPUT_STYLE: React.CSSProperties = { backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB', color: '#1D211F' }

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function isOverdue(d: string | null) {
  return !!d && d < new Date().toISOString().slice(0, 10)
}

// Open tasks sorted by due date (undated last), then the done ones.
function sortTasks(tasks: JobTask[]) {
  return [...tasks].sort((a, b) => {
    if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
    if (a.due_date !== b.due_date) {
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    }
    return a.sort_order - b.sort_order
  })
}

// Anything that needs doing on a live job — items to order, calls to make.
// Open tasks are also listed on the To-Do page (components/todo/TodoView.tsx).
export default function JobTasksTab({ jobId, profiles }: { jobId: string; profiles: Profile[] }) {
  const [tasks, setTasks] = useState<JobTask[]>([])
  const [loading, setLoading] = useState(true)
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    getJobTasks(jobId).then((fetched) => {
      if (!cancelled) {
        setTasks(fetched)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [jobId])

  const handleAdd = async () => {
    setError('')
    if (!description.trim()) { setError('Enter a task'); return }
    setAdding(true)
    const result = await addJobTask(jobId, { description, due_date: dueDate || null, assigned_to: assignedTo || null })
    if (result.error) {
      setError(result.error)
    } else if (result.item) {
      setTasks((prev) => [...prev, result.item as JobTask])
      setDescription('')
      setDueDate('')
    }
    setAdding(false)
  }

  const handleToggle = async (task: JobTask) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: !t.is_done } : t)))
    await toggleJobTask(task.id, !task.is_done)
  }

  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    await deleteJobTask(id)
  }

  const nameOf = (id: string | null) => profiles.find((p) => p.id === id)?.full_name
  const open = tasks.filter((t) => !t.is_done).length

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
      <div className="rounded-lg p-4 space-y-3" style={{ border: '1px solid #E5E7EB' }}>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>New task</p>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
          placeholder="e.g. Order handles, chase worktop template, book electrician..."
          className={INPUT}
          style={INPUT_STYLE}
        />
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            min="2000-01-01"
            max="2099-12-31"
            className={INPUT}
            style={INPUT_STYLE}
            title="Due date (optional)"
          />
          <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={INPUT} style={{ ...INPUT_STYLE, cursor: 'pointer' }}>
            <option value="">Anyone</option>
            {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !description.trim()}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#B89763' }}
          >
            <PlusIcon size={13} />Add
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: '#9CA3AF' }}>Loading...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
          No tasks yet. Add anything that needs doing on this job above.
        </p>
      ) : (
        <div>
          <p className="text-xs mb-2" style={{ color: open > 0 ? '#B45309' : '#9CA3AF' }}>
            {open > 0 ? `${open} open — also listed on the To-Do page.` : 'All done.'}
          </p>
          <div className="space-y-1.5">
            {sortTasks(tasks).map((task) => {
              const overdue = !task.is_done && isOverdue(task.due_date)
              const who = nameOf(task.assigned_to)
              return (
                <div key={task.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                  <input
                    type="checkbox"
                    checked={task.is_done}
                    onChange={() => handleToggle(task)}
                    className="w-4 h-4 rounded flex-none"
                    style={{ accentColor: '#B89763' }}
                  />
                  <span
                    className="flex-1 text-sm"
                    style={{ color: task.is_done ? '#9CA3AF' : '#374151', textDecoration: task.is_done ? 'line-through' : 'none' }}
                  >
                    {task.description}
                  </span>
                  {who && <span className="text-xs flex-none" style={{ color: '#6B7280' }}>{who}</span>}
                  {task.due_date && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full flex-none"
                      style={overdue ? { backgroundColor: '#FEE2E2', color: '#DC2626' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
                    >
                      {overdue ? 'Overdue · ' : ''}{fmtDate(task.due_date)}
                    </span>
                  )}
                  <button onClick={() => handleDelete(task.id)} className="flex-none p-1 rounded hover:bg-red-50" title="Delete task">
                    <Trash2Icon size={13} style={{ color: '#D1D5DB' }} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
