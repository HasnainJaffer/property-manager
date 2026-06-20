'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'
import LoadingScreen from '@/components/ui/LoadingScreen'

// ─── Exported types (pages import from here instead of redefining) ─────────────

export interface PropertyUnit {
  id: string
  unit_ref: string
  unit_type_id: string | null
  status: string
  target_rent: number | null
  unit_types: { label: string } | null
}

export interface PropertyRow {
  id: string
  name: string
  address_line1: string
  city: string
  postcode: string
  property_type_id: string | null
  purchase_price: number | null
  purchase_date: string | null
  current_valuation: number | null
  mortgage_monthly: number | null
  property_types: { label: string } | null
  units: PropertyUnit[]
}

export interface PropertyType { id: string; label: string }

export interface TenantRow {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  right_to_rent_status: string | null
  right_to_rent_expiry: string | null
  is_active: boolean
  tenancy_tenants: Array<{
    tenancies: {
      status: string
      units: { unit_ref: string; properties: { name: string } | null } | null
    } | null
  }>
}

export interface TenancyRow {
  id: string
  status: string
  tenancy_type: string
  rent_amount: number
  rent_frequency: string
  start_date: string
  end_date: string | null
  deposit_amount: number | null
  deposit_scheme: string | null
  deposit_registered_date: string | null
  units: { unit_ref: string; properties: { name: string } | null } | null
  tenancy_tenants: Array<{
    is_lead: boolean
    tenants: { first_name: string; last_name: string } | null
  }>
}

export interface ChargeRow {
  id: string
  charge_type: string
  description: string | null
  due_date: string
  amount: number
  paid_amount: number
  status: string
  tenancies: {
    id: string
    tenancy_tenants: Array<{
      is_lead: boolean
      tenants: { first_name: string; last_name: string } | null
    }>
    units: { unit_ref: string; properties: { name: string } | null } | null
  } | null
}

export interface CertRow {
  id: string
  certificate_type: string
  issued_date: string
  expiry_date: string | null
  status: string
  reference_number: string | null
  notes: string | null
  properties: { name: string } | null
  units: { unit_ref: string } | null
}

export interface IssueRow {
  id: string
  title: string
  description: string | null
  source: string
  priority: string
  status: string
  reported_date: string
  scheduled_date: string | null
  estimated_cost: number | null
  properties: { name: string } | null
  units: { unit_ref: string } | null
}

export interface MemberRow {
  id: string
  first_name: string | null
  last_name: string | null
  is_active: boolean
  created_at: string
  roles: { name: string; label: string } | null
}

export interface InviteRow {
  id: string
  email: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  roles: { name: string; label: string } | null
}

export interface RoleOption { id: string; name: string; label: string }

// ─── Shell data (sidebar) ─────────────────────────────────────────────────────

export interface CurrentUser {
  firstName: string
  lastName: string
  role: UserRole
  roleLabel: string
}

// ─── Context shape ────────────────────────────────────────────────────────────

interface OrgContextValue {
  orgId: string
  orgSlug: string
  orgName: string
  orgTypeLabel: string
  currentUser: CurrentUser | null
  properties: PropertyRow[]
  propertyTypes: PropertyType[]
  tenants: TenantRow[]
  tenancies: TenancyRow[]
  charges: ChargeRow[]
  certs: CertRow[]
  issues: IssueRow[]
  members: MemberRow[]
  invitations: InviteRow[]
  roles: RoleOption[]
  loading: boolean
  // Targeted refreshes — called after mutations so pages stay up to date
  refreshProperties: () => Promise<void>
  refreshTenancies: () => Promise<void>
  refreshTenants: () => Promise<void>
  refreshCharges: () => Promise<void>
  refreshCerts: () => Promise<void>
  refreshIssues: () => Promise<void>
  refreshTeam: () => Promise<void>
  // Optimistic updates — instant UI, DB write happens in background
  updateIssueStatus: (id: string, status: string) => Promise<void>
  cancelInvite: (id: string) => Promise<void>
}

const OrgDataContext = createContext<OrgContextValue | null>(null)

export function useOrgData(): OrgContextValue {
  const ctx = useContext(OrgDataContext)
  if (!ctx) throw new Error('useOrgData must be used within OrgDataProvider')
  return ctx
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrgDataProvider({
  children,
  orgSlug,
  userId,
}: {
  children: React.ReactNode
  orgSlug: string
  userId: string | null
}) {

  const [orgId,       setOrgId]       = useState('')
  const [orgName,     setOrgName]     = useState('')
  const [orgTypeLabel, setOrgTypeLabel] = useState('')
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [properties,  setProperties]  = useState<PropertyRow[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([])
  const [tenants,     setTenants]     = useState<TenantRow[]>([])
  const [tenancies,   setTenancies]   = useState<TenancyRow[]>([])
  const [charges,     setCharges]     = useState<ChargeRow[]>([])
  const [certs,       setCerts]       = useState<CertRow[]>([])
  const [issues,      setIssues]      = useState<IssueRow[]>([])
  const [members,     setMembers]     = useState<MemberRow[]>([])
  const [invitations, setInvitations] = useState<InviteRow[]>([])
  const [roles,       setRoles]       = useState<RoleOption[]>([])
  const [loading,     setLoading]     = useState(true)

  // Charge window: 12 months back → end of current month. Computed once on mount.
  const chargeStart = useMemo(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth() - 11, 1).toISOString().split('T')[0]
  }, [])
  const chargeEnd = useMemo(() => {
    const d = new Date(); return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
  }, [])

  // Fetch all data for the org in parallel — runs once when orgId is first resolved
  const fetchAll = useCallback(async (id: string) => {
    const sb = createClient()
    const [
      { data: propData },
      { data: propTypeData },
      { data: tenantData },
      { data: tenancyData },
      { data: chargeData },
      { data: certData },
      { data: issueData },
      { data: memberData },
      { data: inviteData },
      { data: roleData },
    ] = await Promise.all([

      sb.from('properties')
        .select(`id, name, address_line1, city, postcode,
          purchase_price, purchase_date, current_valuation, mortgage_monthly,
          property_types ( label ),
          units ( id, unit_ref, status, target_rent )`)
        .eq('org_id', id).eq('is_active', true).order('created_at', { ascending: true }),

      sb.from('property_types').select('id, label').order('sort_order'),

      sb.from('tenants')
        .select(`id, first_name, last_name, email, phone,
          right_to_rent_status, right_to_rent_expiry, is_active,
          tenancy_tenants ( tenancies ( status, units ( unit_ref, properties ( name ) ) ) )`)
        .eq('org_id', id).order('last_name', { ascending: true }),

      sb.from('tenancies')
        .select(`id, status, tenancy_type, rent_amount, rent_frequency,
          start_date, end_date, deposit_amount, deposit_scheme, deposit_registered_date,
          units ( unit_ref, properties ( name ) ),
          tenancy_tenants ( is_lead, tenants ( first_name, last_name ) )`)
        .eq('org_id', id).order('start_date', { ascending: false }),

      sb.from('charges')
        .select(`id, charge_type, description, due_date, amount, paid_amount, status,
          tenancies ( id, tenancy_tenants ( is_lead, tenants ( first_name, last_name ) ),
          units ( unit_ref, properties ( name ) ) )`)
        .eq('org_id', id)
        .gte('due_date', chargeStart).lte('due_date', chargeEnd)
        .neq('status', 'waived').order('due_date', { ascending: true }),

      sb.from('certificates')
        .select(`id, certificate_type, issued_date, expiry_date, status,
          reference_number, notes, properties ( name ), units ( unit_ref )`)
        .eq('org_id', id).eq('is_active', true)
        .order('expiry_date', { ascending: true, nullsFirst: false }),

      sb.from('issues')
        .select(`id, title, description, source, priority, status,
          reported_date, scheduled_date, estimated_cost,
          properties ( name ), units ( unit_ref )`)
        .eq('org_id', id).eq('is_active', true).order('reported_date', { ascending: false }),

      sb.from('profiles')
        .select('id, first_name, last_name, is_active, created_at, roles ( name, label )')
        .eq('org_id', id).order('created_at', { ascending: true }),

      sb.from('invitations')
        .select('id, email, created_at, expires_at, accepted_at, roles ( name, label )')
        .eq('org_id', id).is('accepted_at', null).order('created_at', { ascending: false }),

      sb.from('roles').select('id, name, label').order('sort_order', { ascending: true }),
    ])

    setProperties((propData  as unknown as PropertyRow[])  ?? [])
    setPropertyTypes((propTypeData as PropertyType[])      ?? [])
    setTenants((tenantData   as unknown as TenantRow[])    ?? [])
    setTenancies((tenancyData as unknown as TenancyRow[])  ?? [])
    setCharges((chargeData   as unknown as ChargeRow[])    ?? [])
    setCerts((certData       as unknown as CertRow[])      ?? [])
    setIssues((issueData     as unknown as IssueRow[])     ?? [])
    setMembers((memberData   as unknown as MemberRow[])    ?? [])
    setInvitations((inviteData as unknown as InviteRow[])  ?? [])
    setRoles((roleData as RoleOption[])                    ?? [])
  }, [chargeStart, chargeEnd])

  // Bootstrap: orgSlug and userId are resolved server-side by layout.tsx and
  // passed as props — no client-side auth.getUser() call that can hang on Vercel.
  useEffect(() => {
    if (!orgSlug || !userId) return

    const run = async () => {
      setLoading(true)
      try {
        const sb = createClient()

        const { data: org } = await sb
          .from('organisations')
          .select('id, name, organisation_types ( label )')
          .eq('slug', orgSlug)
          .single()

        if (!org) return

        setOrgId(org.id)
        setOrgName(org.name)
        setOrgTypeLabel(
          (org.organisation_types as unknown as { label: string } | null)?.label ?? ''
        )

        const [, { data: profile }] = await Promise.all([
          fetchAll(org.id),
          sb.from('profiles')
            .select('first_name, last_name, roles ( name, label )')
            .eq('user_id', userId)
            .eq('org_id', org.id)
            .single(),
        ])

        const p = profile as unknown as {
          first_name: string | null
          last_name: string | null
          roles: { name: string; label: string } | null
        } | null

        if (p) {
          setCurrentUser({
            firstName: p.first_name ?? '',
            lastName:  p.last_name  ?? '',
            role:      (p.roles?.name ?? 'owner') as UserRole,
            roleLabel: p.roles?.label ?? '',
          })
        }
      } catch (err) {
        console.error('OrgDataProvider bootstrap failed:', err)
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [orgSlug, userId, fetchAll])

  // ── Targeted refreshes ────────────────────────────────────────────────────

  const refreshTenancies = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('tenancies')
      .select(`id, status, tenancy_type, rent_amount, rent_frequency,
        start_date, end_date, deposit_amount, deposit_scheme, deposit_registered_date,
        units ( unit_ref, properties ( name ) ),
        tenancy_tenants ( is_lead, tenants ( first_name, last_name ) )`)
      .eq('org_id', orgId).order('start_date', { ascending: false })
    setTenancies((data as unknown as TenancyRow[]) ?? [])
  }, [orgId])

  const refreshTenants = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('tenants')
      .select(`id, first_name, last_name, email, phone,
        right_to_rent_status, right_to_rent_expiry, is_active,
        tenancy_tenants ( tenancies ( status, units ( unit_ref, properties ( name ) ) ) )`)
      .eq('org_id', orgId).order('last_name', { ascending: true })
    setTenants((data as unknown as TenantRow[]) ?? [])
  }, [orgId])

  const refreshProperties = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('properties')
      .select(`id, name, address_line1, city, postcode,
        purchase_price, purchase_date, current_valuation, mortgage_monthly,
        property_type_id, property_types ( label ), units ( id, unit_ref, unit_type_id, status, target_rent, unit_types ( label ) )`)
      .eq('org_id', orgId).eq('is_active', true).order('created_at', { ascending: true })
    setProperties((data as unknown as PropertyRow[]) ?? [])
  }, [orgId])

  const refreshCharges = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('charges')
      .select(`id, charge_type, description, due_date, amount, paid_amount, status,
        tenancies ( id, tenancy_tenants ( is_lead, tenants ( first_name, last_name ) ),
        units ( unit_ref, properties ( name ) ) )`)
      .eq('org_id', orgId)
      .gte('due_date', chargeStart).lte('due_date', chargeEnd)
      .neq('status', 'waived').order('due_date', { ascending: true })
    setCharges((data as unknown as ChargeRow[]) ?? [])
  }, [orgId, chargeStart, chargeEnd])

  const refreshCerts = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('certificates')
      .select(`id, certificate_type, issued_date, expiry_date, status,
        reference_number, notes, properties ( name ), units ( unit_ref )`)
      .eq('org_id', orgId).eq('is_active', true)
      .order('expiry_date', { ascending: true, nullsFirst: false })
    setCerts((data as unknown as CertRow[]) ?? [])
  }, [orgId])

  const refreshIssues = useCallback(async () => {
    if (!orgId) return
    const { data } = await createClient()
      .from('issues')
      .select(`id, title, description, source, priority, status,
        reported_date, scheduled_date, estimated_cost,
        properties ( name ), units ( unit_ref )`)
      .eq('org_id', orgId).eq('is_active', true).order('reported_date', { ascending: false })
    setIssues((data as unknown as IssueRow[]) ?? [])
  }, [orgId])

  const refreshTeam = useCallback(async () => {
    if (!orgId) return
    const sb = createClient()
    const [{ data: memberData }, { data: inviteData }] = await Promise.all([
      sb.from('profiles').select('id, first_name, last_name, is_active, created_at, roles ( name, label )').eq('org_id', orgId).order('created_at', { ascending: true }),
      sb.from('invitations').select('id, email, created_at, expires_at, accepted_at, roles ( name, label )').eq('org_id', orgId).is('accepted_at', null).order('created_at', { ascending: false }),
    ])
    setMembers((memberData as unknown as MemberRow[]) ?? [])
    setInvitations((inviteData as unknown as InviteRow[]) ?? [])
  }, [orgId])

  // ── Optimistic mutations ──────────────────────────────────────────────────

  const updateIssueStatus = useCallback(async (id: string, status: string) => {
    setIssues(prev => prev.map(i => i.id === id ? { ...i, status } : i))
    await createClient().from('issues').update({ status }).eq('id', id)
  }, [])

  const cancelInvite = useCallback(async (id: string) => {
    setInvitations(prev => prev.filter(i => i.id !== id))
    await createClient().from('invitations').delete().eq('id', id)
  }, [])

  // Cycle through loading messages while the bootstrap is running
  const [loadingMsg, setLoadingMsg] = useState('Getting your data…')
  useEffect(() => {
    if (!loading) { setLoadingMsg('Getting your data…'); return }
    const t = setTimeout(() => setLoadingMsg('Loading application…'), 1800)
    return () => clearTimeout(t)
  }, [loading])

  return (
    <OrgDataContext.Provider value={{
      orgId, orgSlug, orgName, orgTypeLabel, currentUser,
      properties, propertyTypes, tenants, tenancies, charges, certs, issues, members, invitations, roles,
      loading,
      refreshProperties, refreshTenancies, refreshTenants, refreshCharges, refreshCerts, refreshIssues, refreshTeam,
      updateIssueStatus, cancelInvite,
    }}>
      {/* Loading screen sits as a fixed overlay so children always mount,
          React hooks in child components are never broken by a conditional tree. */}
      {loading && <LoadingScreen message={loadingMsg} />}
      {children}
    </OrgDataContext.Provider>
  )
}
