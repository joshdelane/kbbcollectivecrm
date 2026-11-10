'use client'

import { useState } from 'react'
import { LOST_REASONS, STAGE_ACTIONS, STAGES } from '@/types'
import type { Job } from '@/types'

export type StageMove = 'advance' | 'dead' | 'archive'

// Confirm step for the one-click stage buttons, so a misclick can't move a
// job. Marking a lead dead or archiving it also asks why it was lost.
export default function StageConfirmDialog({
  job,
  move,
  busy,
  onConfirm,
  onCancel,
}: {
  job: Job
  move: StageMove
  busy: boolean
  onConfirm: (lostReason?: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const action = STAGE_ACTIONS[job.stage]
  const nextLabel = STAGES.find((s) => s.key === action?.nextStage)?.label
  const isLoss = move === 'dead' || move === 'archive'

  const title =
    move === 'dead' ? 'Mark as dead?'
    : move === 'archive' ? 'Archive this lead?'
    : action?.nextStage === 'archived' ? 'Mark as signed off?'
    : `${action?.label}?`
  const detail =
    isLoss ? 'It moves to Dead Leads. You can revive it from there.'
    : action?.nextStage === 'archived' ? 'It moves to Finished.'
    : `It moves to ${nextLabel}.`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => { e.stopPropagation(); onCancel() }}
    >
      <div
        className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
        style={{ backgroundColor: '#FFFFFF' }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xs font-bold mb-1" style={{ color: '#B89763' }}>{job.job_id}</p>
        <p className="text-base font-semibold mb-1" style={{ color: '#1D211F' }}>{title}</p>
        <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
          <span className="font-medium" style={{ color: '#374151' }}>{job.customer_name}</span>. {detail}
        </p>

        {isLoss && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#9CA3AF' }}>Why was it lost?</p>
            <div className="flex flex-wrap gap-2">
              {LOST_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(reason === r ? '' : r)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                  style={reason === r
                    ? { backgroundColor: '#1D211F', color: '#FFFFFF', border: '1px solid #1D211F' }
                    : { backgroundColor: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(isLoss ? reason || undefined : undefined)}
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: move === 'dead' ? '#DC2626' : move === 'archive' ? '#6B7280' : '#B89763' }}
          >
            {busy ? 'Moving...' : move === 'dead' ? 'Mark dead' : move === 'archive' ? 'Archive' : `Yes, ${action?.label}`}
          </button>
        </div>
      </div>
    </div>
  )
}
