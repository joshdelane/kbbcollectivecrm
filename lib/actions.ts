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

  // Fetch current job fields needed for assignment propagation and install date copy.
  const { data: job } = await supabase
    .from('jobs')
    .select('assigned_to, designer_assigned, project_manager_assigned, installer_assigned, proposed_install_date')
    .eq('id', jobId)
    .single()

  // Propagate assigned_to into the stage-specific assignee field if not already set.
  if (currentStage === 'enquiries' && job?.assigned_to && !job.designer_assigned) {
    updatePayload.designer_assigned = job.assigned_to
  }
  if (currentStage === 'qualified_leads' && job?.assigned_to && !job.project_manager_assigned) {
    updatePayload.project_manager_assigned = job.assigned_to
  }
  if (currentStage === 'order_processing' && job?.assigned_to && !job.installer_assigned) {
    updatePayload.installer_assigned = job.assigned_to
  }

  // Copy proposed install date when moving into project management.
  if (currentStage === 'order_processing' && job?.proposed_install_date) {
    updatePayload.signed_off_install_date = job.proposed_install_date
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
    .select('dead_at, signed_off_at, order_placed_at, sold_at, qualified_at')
    .eq('id', jobId)
    .eq('stage', 'archived')
    .single()

  if (!job) return { error: 'Job not found or not archived' }

  // Determine the stage the job was in when it was archived.
  let updatePayload: Record<string, unknown>
  if (job.dead_at) {
    // Marked dead from enquiries
    updatePayload = { stage: 'enquiries', dead_at: null }
  } else if (job.signed_off_at) {
    // Completed from project management
    updatePayload = { stage: 'project_management', signed_off_at: null }
  } else if (job.order_placed_at) {
    // Archived from order processing
    updatePayload = { stage: 'order_processing' }
  } else if (job.sold_at || job.qualified_at) {
    // Archived from qualified leads
    updatePayload = { stage: 'qualified_leads' }
  } else {
    updatePayload = { stage: 'enquiries' }
  }

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

export async function archiveQualifiedLead(jobId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ stage: 'archived' })
    .eq('id', jobId)
    .eq('stage', 'qualified_leads')

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
  lines: Array<{ category: string | null; description: string; retail_price: number | null; cost_price: number | null; discount_percent: number; is_ordered: boolean }>
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
        discount_percent: l.discount_percent ?? 0,
        is_ordered: l.is_ordered,
      }))
    )
    if (insertError) return { error: insertError.message }
  }

  // Sync quote_total (net after discount) on the job (from the latest revision)
  const { data: jobData } = await supabase
    .from('jobs')
    .select('quote_revision')
    .eq('id', jobId)
    .single()
  if (revisionNumber >= (jobData?.quote_revision ?? 1)) {
    const quoteTotal = lines.reduce((s, l) => {
      const retail = l.retail_price ?? 0
      const disc = l.discount_percent ?? 0
      return s + retail * (1 - disc / 100)
    }, 0)
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
        discount_percent: l.discount_percent ?? 0,
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

export async function revertJobToQualified(jobId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ stage: 'qualified_leads', sold_at: null })
    .eq('id', jobId)
    .eq('stage', 'order_processing')

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateJobEnquiryDate(jobId: string, date: string) {
  if (!date) return { success: true }
  const supabase = await createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ created_at: date })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteJob(jobId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', jobId)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Marketing Spend ──────────────────────────────────────────────

export async function createMarketingSpend(data: {
  channel: string
  amount: number
  spend_month: string // 'YYYY-MM-DD' (first day of month)
  notes?: string
}) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }

  const { error } = await supabase
    .from('marketing_spend')
    .insert([{ ...data, organisation_id: orgId }])
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updateMarketingSpend(
  id: string,
  data: { channel?: string; amount?: number; spend_month?: string; notes?: string }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('marketing_spend')
    .update(data)
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function deleteMarketingSpend(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('marketing_spend')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { success: true }
}

// ── Global Job Search ─────────────────────────────────────────────

export async function searchJobs(query: string): Promise<
  Array<{ id: string; job_id: string; customer_name: string; stage: Stage }>
> {
  if (!query.trim()) return []
  const supabase = await createClient()
  const q = query.trim()
  const { data } = await supabase
    .from('jobs')
    .select('id, job_id, customer_name, stage')
    .is('deleted_at', null)
    .or(`customer_name.ilike.%${q}%,job_id.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as Array<{ id: string; job_id: string; customer_name: string; stage: Stage }>
}

export async function getOrgLogo(): Promise<string | null> {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return null
  const { data } = await supabase
    .from('organisations')
    .select('logo_url')
    .eq('id', orgId)
    .single()
  return data?.logo_url ?? null
}

export async function saveOrgLogo(logoUrl: string | null) {
  const supabase = await createClient()
  const orgId = await getOrgId()
  if (!orgId) return { error: 'No organisation found' }
  const { error } = await supabase
    .from('organisations')
    .update({ logo_url: logoUrl })
    .eq('id', orgId)
  if (error) return { error: error.message }
  return { success: true }
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
