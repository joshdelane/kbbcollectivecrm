import { PASS_THROUGH_CATEGORY } from '@/types'

type MarginLine = {
  job_id: string
  category?: string | null
  retail_price: number | null
  cost_price: number | null
  discount_percent: number | null
  revision_number: number
}

// Revenue and cost per job from its latest quote revision plus extra costs.
// Pass-through lines are bought and re-invoiced at cost, so they're skipped.
// Shared by the dashboard tile and the leaderboard so they always agree.
export function jobMarginTotals(
  lines: MarginLine[],
  extraCosts: { job_id: string; amount: number }[],
  revisionMap: Map<string, number>
): Map<string, { revenue: number; cost: number }> {
  const totals = new Map<string, { revenue: number; cost: number }>()
  for (const line of lines) {
    if (line.revision_number !== revisionMap.get(line.job_id)) continue
    if (line.category === PASS_THROUGH_CATEGORY) continue
    if (!totals.has(line.job_id)) totals.set(line.job_id, { revenue: 0, cost: 0 })
    const entry = totals.get(line.job_id)!
    const retail = Number(line.retail_price ?? 0)
    const disc = Number(line.discount_percent ?? 0)
    entry.revenue += retail * (1 - disc / 100)
    entry.cost += Number(line.cost_price ?? 0)
  }
  // Unforeseen costs discovered after quoting eat into the same margin
  for (const row of extraCosts) {
    const entry = totals.get(row.job_id)
    if (entry) entry.cost += Number(row.amount ?? 0)
  }
  return totals
}
