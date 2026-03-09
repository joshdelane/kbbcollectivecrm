export type Stage =
  | 'enquiries'
  | 'qualified_leads'
  | 'order_processing'
  | 'project_management'
  | 'archived'

export interface Profile {
  id: string
  full_name: string
  email: string
  company_name: string | null
  created_at: string
}

export interface EnquirySource {
  id: string
  name: string
  sort_order: number
  created_at: string
}

export interface Job {
  id: string
  job_id: string
  stage: Stage

  // Customer info
  customer_name: string
  phone: string | null
  email: string | null
  postcode: string | null
  enquiry_source: string | null
  rough_budget: number | null
  notes: string | null

  // Assigned users
  assigned_to: string | null
  designer_assigned: string | null
  installer_assigned: string | null
  project_manager_assigned: string | null

  // Order processing
  order_valuation: number | null
  proposed_install_date: string | null
  deposit_amount: number | null
  deposit_received_at: string | null
  fitting_days: number | null
  site_dimensions_captured: boolean

  // Project management
  pm_site_dimensions_captured: boolean
  signed_off_install_date: string | null
  worktop_template_date: string | null
  worktop_install_date: string | null
  snag_list: string | null
  project_signed_off: boolean
  client_sign_off_date: string | null

  // Quote
  quote_total: number | null
  quote_revision: number

  // Timestamps
  created_at: string
  updated_at: string
  qualified_at: string | null
  sold_at: string | null
  order_placed_at: string | null
  signed_off_at: string | null
  dead_at: string | null
}

export const QUOTE_CATEGORIES = [
  'Cabinetry',
  'Appliances',
  'Sinks and Taps',
  'Worktops',
  'Installation',
] as const

export type QuoteCategory = typeof QUOTE_CATEGORIES[number]

export interface QuoteLine {
  id: string
  job_id: string
  sort_order: number
  revision_number: number
  category: QuoteCategory | null
  description: string
  retail_price: number | null
  cost_price: number | null
  is_ordered: boolean
  created_at: string
}

export interface StageCount {
  stage: Stage
  count: number
}

export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'enquiries', label: 'Enquiries', color: '#3B82F6' },
  { key: 'qualified_leads', label: 'Qualified Leads', color: '#8B5CF6' },
  { key: 'order_processing', label: 'Order Processing', color: '#F59E0B' },
  { key: 'project_management', label: 'Project Management', color: '#10B981' },
  { key: 'archived', label: 'Archived', color: '#6B7280' },
]

export const STAGE_ACTIONS: Partial<Record<Stage, { label: string; nextStage: Stage }>> = {
  enquiries: { label: 'Qualify', nextStage: 'qualified_leads' },
  qualified_leads: { label: 'Project Sold', nextStage: 'order_processing' },
  order_processing: { label: 'Order Placed', nextStage: 'project_management' },
  project_management: { label: 'Signed Off', nextStage: 'archived' },
}
