import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

// POST /api/zapier/leads
// Zapier sends a lead here. Auth is via a per-org webhook secret in the
// Authorization header: "Bearer <webhook_secret>"
//
// Expected JSON body (all optional except customer_name):
// {
//   "customer_name": "Jane Smith",   // required
//   "phone":         "07700 900000",
//   "email":         "jane@example.com",
//   "enquiry_source": "Facebook Ads",
//   "notes":         "Interested in full kitchen refit",
//   "rough_budget":  15000
// }

export async function POST(req: NextRequest) {
  // ── 1. Extract and validate the secret ───────────────────────
  const auth = req.headers.get('authorization') ?? ''
  const secret = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!secret) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  // ── 2. Look up the org by webhook_secret ─────────────────────
  const supabase = createServiceClient()

  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .select('id')
    .eq('webhook_secret', secret)
    .single()

  if (orgError || !org) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
  }

  // ── 3. Parse and validate the body ───────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const customerName = (body.customer_name as string | undefined)?.trim()
  if (!customerName) {
    return NextResponse.json({ error: 'customer_name is required' }, { status: 400 })
  }

  // ── 4. Create the job in the enquiries stage ──────────────────
  const insert: Record<string, unknown> = {
    organisation_id: org.id,
    stage: 'enquiries',
    customer_name: customerName,
  }

  if (body.phone)          insert.phone          = String(body.phone).trim()
  if (body.email)          insert.email          = String(body.email).trim()
  if (body.enquiry_source) insert.enquiry_source = String(body.enquiry_source).trim()
  if (body.notes)          insert.notes          = String(body.notes).trim()
  if (body.rough_budget)   insert.rough_budget   = Number(body.rough_budget)

  const { data: job, error: insertError } = await supabase
    .from('jobs')
    .insert([insert])
    .select('job_id, id')
    .single()

  if (insertError) {
    console.error('[zapier/leads] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }

  return NextResponse.json({ success: true, job_id: job.job_id, id: job.id }, { status: 201 })
}
