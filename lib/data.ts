import { createClient } from '@/lib/supabase/server'
import type { Stage } from '@/types'

export async function getStageCounts(): Promise<Record<Stage, number>> {
  const supabase = await createClient()
  const { data } = await supabase.from('jobs').select('stage')

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    counts[row.stage] = (counts[row.stage] ?? 0) + 1
  }
  return counts as Record<Stage, number>
}

// Returns close rate (0–1) per enquiry source, based on historical sold vs dead jobs.
// A job "resolves" when it gets sold (sold_at) or dies (dead_at).
export async function getSourceCloseRates(): Promise<Record<string, number>> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('jobs')
    .select('enquiry_source, sold_at, dead_at')
    .or('sold_at.not.is.null,dead_at.not.is.null')

  const counts: Record<string, { sold: number; total: number }> = {}
  for (const row of data ?? []) {
    const source = row.enquiry_source ?? '__unknown__'
    if (!counts[source]) counts[source] = { sold: 0, total: 0 }
    counts[source].total++
    if (row.sold_at) counts[source].sold++
  }

  const rates: Record<string, number> = {}
  for (const [source, { sold, total }] of Object.entries(counts)) {
    rates[source] = total > 0 ? sold / total : 0
  }
  return rates
}
