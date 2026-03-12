'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Job, Stage } from '@/types'

// ── Helper: get current user's organisation_id ────────────────
async function getOrgId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('organisation_id')
    .eq('id', user.id)
    .single()
  return data?.organisation_id ?? null
}

// ── Create organisation (called from /setup) ──────────────────
export async function createOrganisation(name: string, prefix?: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_organisation', {
    org_name: name,
    org_prefix: prefix ?? 'KBB',
  })
  if (error) return { error: error.message }
  revalidatePath('/', 'layout')
  return { success: true, organisationId: data as string }
}

// ── Join organisation via invite code ────────────────────────
export async function joinOrganisation(code: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('join_organisation', { code })
  if (error) return { error: 'Invalid invite code. Please check and try again.' }
  revalidatePath('/', 'layout')
  return { success: true, organisationId: data as string }
}

const STAGE_TRANSITIONS: Record<string, { nextStage: Stage; timestampField: string }> = {
  enquiries: { nextStage: 'qualified_leads', timestampField: 'qualified_at' },
  qualified_leads: { nextStage: 'order_processing', timestampField: 'sold_at' },
  order_processing: { nextStage: 'project_management', timestampField: 'order_placed_at' },
  project_management: { nextStage: 'archived', timestampField: 'signed_off_at' },
}

export async function advanceJobStage(jobId: string, currentStage: Stage) {
  const transition = STAGE_TRANSITIONS[currentStage]
  if (!transition) return { error: 'No transition available for this stage' }

  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    stage: transition.nextStage,
    [transition.timestampField]: new Date().toISOString(),
  }

  // When moving from order processing to project management, copy the proposed
  // install date to signed_off_install_date so the install calendar can use it.
  if (currentStage === 'order_processing') {
    const { data: job } = await supabase
      .from('jobs')
      .select('proposed_install_date')
      .eq('id', jobId)
      .single()
    if (job?.proposed_install_date) {
      updatePayload.signed_off_install_date = job.proposed_install_date
    }
  }

  const { error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function reviveJob(jobId: string) {
  const supabase = await createClient()

  const { data: job } = await supabase
    .from('jobs')
    .select('dead_at, signed_off_at')
    .eq('id', jobId)
    .eq('stage', 'archived')
    .single()

  if (!job) return { error: 'Job not found or not archived' }

  const updatePayload: Record<string, unknown> = job.dead_at
    ? { stage: 'enquiries', dead_at: null }
    : { stage: 'project_management', signed_off_at: null }

  const { error } = await supabase
    .from('jobs')
    .update(updatePayload)
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function markJobDead(jobId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ stage: 'archived', dead_at: new Date().toISOString() })
    .eq('id', jobId)
    .eq('stage', 'enquiries')

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function createJob(data: {
  customer_name: string
  phone?: string
  email?: string
  postcode?: string
  enquiry_source?: string
  rough_budget?: number
  notes?: string
  assigned_to?: string
}) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const clean = Object.fromEntries(
    Object.entries(data).filter(([, v]) => v !== '' && v !== undefined)
  )

  const { error } = await supabase.from('jobs').insert([{ ...clean, organisation_id: orgId }])
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateJob(
  jobId: string,
  data: Partial<Omit<Job, 'id' | 'job_id' | 'stage' | 'created_at' | 'updated_at'>>
) {
  const supabase = await createClient()

  const clean = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === '' ? null : v])
  )

  const { error } = await supabase.from('jobs').update(clean).eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getQuoteLines(jobId: string, revisionNumber?: number) {
  const supabase = await createClient()

  // If no revision specified, fetch the latest
  let revision = revisionNumber
  if (!revision) {
    const { data: job } = await supabase
      .from('jobs')
      .select('quote_revision')
      .eq('id', jobId)
      .single()
    revision = job?.quote_revision ?? 1
  }

  const { data, error } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('job_id', jobId)
    .eq('revision_number', revision)
    .order('sort_order', { ascending: true })
  if (error) return { lines: [], revision, error: error.message }
  return { lines: data ?? [], revision }
}

export async function getQuoteRevisionNumbers(jobId: string): Promise<number[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('quote_lines')
    .select('revision_number')
    .eq('job_id', jobId)
  if (!data) return [1]
  const unique = [...new Set(data.map((r) => r.revision_number as number))].sort((a, b) => a - b)
  return unique.length > 0 ? unique : [1]
}

export async function saveQuoteLines(
  jobId: string,
  revisionNumber: number,
  lines: Array<{ category: string | null; description: string; retail_price: number | null; cost_price: number | null; is_ordered: boolean }>
) {
  const supabase = await createClient()

  // Delete only lines for this revision
  const { error: deleteError } = await supabase
    .from('quote_lines')
    .delete()
    .eq('job_id', jobId)
    .eq('revision_number', revisionNumber)
  if (deleteError) return { error: deleteError.message }

  if (lines.length > 0) {
    const { error: insertError } = await supabase.from('quote_lines').insert(
      lines.map((l, i) => ({
        job_id: jobId,
        sort_order: i,
        revision_number: revisionNumber,
        category: l.category ?? null,
        description: l.description,
        retail_price: l.retail_price,
        cost_price: l.cost_price,
        is_ordered: l.is_ordered,
      }))
    )
    if (insertError) return { error: insertError.message }
  }

  // Sync quote_total and quote_revision on the job (from the latest revision)
  const { data: jobData } = await supabase
    .from('jobs')
    .select('quote_revision')
    .eq('id', jobId)
    .single()
  if (revisionNumber >= (jobData?.quote_revision ?? 1)) {
    const quoteTotal = lines.reduce((s, l) => s + (l.retail_price ?? 0), 0)
    await supabase
      .from('jobs')
      .update({ quote_total: quoteTotal > 0 ? quoteTotal : null })
      .eq('id', jobId)
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function createQuoteRevision(jobId: string) {
  const supabase = await createClient()

  // Get current latest revision number
  const { data: jobData } = await supabase
    .from('jobs')
    .select('quote_revision')
    .eq('id', jobId)
    .single()
  const currentRevision = jobData?.quote_revision ?? 1
  const newRevision = currentRevision + 1

  // Copy all lines from current revision into the new revision
  const { data: currentLines } = await supabase
    .from('quote_lines')
    .select('*')
    .eq('job_id', jobId)
    .eq('revision_number', currentRevision)
    .order('sort_order', { ascending: true })

  if (currentLines && currentLines.length > 0) {
    const { error: insertError } = await supabase.from('quote_lines').insert(
      currentLines.map((l) => ({
        job_id: jobId,
        sort_order: l.sort_order,
        revision_number: newRevision,
        category: l.category ?? null,
        description: l.description,
        retail_price: l.retail_price,
        cost_price: l.cost_price,
        is_ordered: false, // new revision starts with nothing ordered
      }))
    )
    if (insertError) return { error: insertError.message, revision: currentRevision }
  }

  // Update job's latest revision pointer
  await supabase
    .from('jobs')
    .update({ quote_revision: newRevision })
    .eq('id', jobId)

  revalidatePath('/', 'layout')
  return { success: true, revision: newRevision }
}

export async function createEnquirySource(name: string) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { data, error } = await supabase
    .from('enquiry_sources')
    .insert([{ name: name.trim(), organisation_id: orgId }])
    .select()
    .single()

  if (error) return { error: error.message }

  return { success: true, source: data }
}
