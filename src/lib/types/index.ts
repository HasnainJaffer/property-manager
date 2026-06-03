// ─── Auth & Org ───────────────────────────────────────────────────────────────

export type OrgPlan = 'free' | 'starter' | 'pro' | 'enterprise'

export type UserRole =
  | 'owner'
  | 'manager'
  | 'accountant'
  | 'staff'
  | 'maintenance'
  | 'cleaner'
  | 'viewer'

export interface Organisation {
  id: string
  name: string
  slug: string
  organisation_type: string
  organisation_type_label: string
  plan: OrgPlan
  email: string | null
  phone: string | null
  website: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postcode: string | null
  country: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Properties ───────────────────────────────────────────────────────────────

export type PropertyType =
  | 'terraced'
  | 'semi_detached'
  | 'detached'
  | 'bungalow'
  | 'flat'
  | 'maisonette'
  | 'studio'
  | 'hmo'
  | 'commercial'
  | 'land'
  | 'other'

export interface Property {
  id: string
  org_id: string
  property_type_id: string
  property_type: PropertyType
  property_type_label: string
  name: string
  internal_ref: string | null
  address_line1: string
  address_line2: string | null
  city: string
  county: string | null
  postcode: string
  country: string
  purchase_price: number | null
  purchase_date: string | null
  current_valuation: number | null
  valuation_date: string | null
  mortgage_lender: string | null
  mortgage_account_ref: string | null
  mortgage_monthly: number | null
  description: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Units ────────────────────────────────────────────────────────────────────

export type UnitType =
  | 'studio'
  | 'one_bed'
  | 'two_bed'
  | 'three_bed'
  | 'four_bed'
  | 'five_bed_plus'
  | 'room'
  | 'whole_house'
  | 'commercial_unit'

export type UnitStatus = 'vacant' | 'occupied' | 'under_maintenance' | 'unavailable'

export type FurnishingType = 'unfurnished' | 'part_furnished' | 'fully_furnished'

export interface Unit {
  id: string
  org_id: string
  property_id: string
  unit_type_id: string
  unit_type: UnitType
  unit_type_label: string
  unit_ref: string
  floor_number: number | null
  bedrooms: number
  bathrooms: number
  floor_area_sqft: number | null
  floor_area_sqm: number | null
  max_occupants: number | null
  target_rent: number | null
  deposit_weeks: number
  furnishing: FurnishingType
  status: UnitStatus
  description: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Tenants ──────────────────────────────────────────────────────────────────

export type RightToRentStatus = 'not_checked' | 'unlimited' | 'time_limited' | 'failed'

export type IdType = 'passport' | 'driving_licence' | 'brp' | 'euss' | 'other'

export interface Tenant {
  id: string
  org_id: string
  title: string | null
  first_name: string
  last_name: string
  date_of_birth: string | null
  email: string | null
  phone: string | null
  national_insurance_number: string | null
  nationality: string | null
  id_type: IdType | null
  id_number: string | null
  id_expiry: string | null
  right_to_rent_status: RightToRentStatus
  right_to_rent_check_date: string | null
  right_to_rent_expiry: string | null
  current_address_line1: string | null
  current_address_line2: string | null
  current_city: string | null
  current_postcode: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relationship: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Tenancies ────────────────────────────────────────────────────────────────

export type TenancyType =
  | 'ast'
  | 'statutory_periodic'
  | 'contractual_periodic'
  | 'licence'
  | 'other'

export type TenancyStatus = 'active' | 'periodic' | 'in_notice' | 'ended' | 'cancelled'

export type RentFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly'

export type DepositScheme = 'dps' | 'tds' | 'mydeposits' | 'none'

export interface Tenancy {
  id: string
  org_id: string
  unit_id: string
  tenancy_type: TenancyType
  status: TenancyStatus
  start_date: string
  end_date: string | null
  break_clause_date: string | null
  notice_period_days: number
  rent_amount: number
  rent_frequency: RentFrequency
  rent_due_day: number
  deposit_amount: number | null
  deposit_weeks: number
  deposit_scheme: DepositScheme | null
  deposit_scheme_ref: string | null
  deposit_registered_date: string | null
  is_furnished: boolean
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenancyTenant {
  id: string
  tenancy_id: string
  tenant_id: string
  is_lead: boolean
  added_at: string
}

// ─── Rent ─────────────────────────────────────────────────────────────────────

export type ChargeStatus = 'pending' | 'paid' | 'overdue' | 'partial' | 'waived'

export interface RentCharge {
  id: string
  tenancy_id: string
  due_date: string
  amount: number
  status: ChargeStatus
  paid_amount: number
  balance: number
}

export interface RentPayment {
  id: string
  tenancy_id: string
  amount: number
  payment_date: string
  payment_method: string | null
  reference: string | null
  notes: string | null
  created_at: string
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type CertificateType =
  | 'gas_safety'
  | 'eicr'
  | 'epc'
  | 'pat_test'
  | 'fire_alarm'
  | 'legionella'
  | 'hmo_licence'
  | 'other'

export type CertificateStatus = 'valid' | 'expiring_soon' | 'expired' | 'not_required'

export interface ComplianceCertificate {
  id: string
  org_id: string
  property_id: string
  certificate_type: CertificateType
  certificate_type_label: string
  reference_number: string | null
  issued_date: string
  expiry_date: string
  notes: string | null
  status: CertificateStatus
  created_at: string
  updated_at: string
}

// ─── Maintenance ──────────────────────────────────────────────────────────────

export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'

export type MaintenanceStatus =
  | 'open'
  | 'in_progress'
  | 'scheduled'
  | 'completed'
  | 'cancelled'

export type MaintenanceSource = 'tenant' | 'inspection' | 'landlord' | 'contractor'

export interface MaintenanceIssue {
  id: string
  org_id: string
  property_id: string
  unit_id: string | null
  title: string
  description: string | null
  source: MaintenanceSource
  priority: MaintenancePriority
  status: MaintenanceStatus
  reported_date: string
  scheduled_date: string | null
  completed_date: string | null
  estimated_cost: number | null
  actual_cost: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  user_id: string
  org_id: string
  role: UserRole
  role_label: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
  last_seen_at: string | null
}
