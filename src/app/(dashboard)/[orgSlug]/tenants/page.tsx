'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRow {
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
      units: {
        unit_ref: string
        properties: { name: string } | null
      } | null
    } | null
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr); end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function currentTenancy(row: TenantRow) {
  const active = row.tenancy_tenants.find(tt => {
    const s = tt.tenancies?.status
    return s === 'active' || s === 'periodic' || s === 'in_notice'
  })
  return active?.tenancies?.units ?? null
}

// ─── Animations ───────────────────────────────────────────────────────────────

const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const row     = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function RightToRentBadge({ tenant }: { tenant: TenantRow }) {
  const status = tenant.right_to_rent_status
  if (!status || status === 'not_applicable') {
    return <span className="crystal-pill void" style={{ fontSize: 10.5 }}>N/A</span>
  }
  if (status === 'not_checked') {
    return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>Not Checked</span>
  }
  if (status === 'failed') {
    return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>Failed</span>
  }
  if (status === 'time_limited') {
    if (tenant.right_to_rent_expiry) {
      const days = daysUntil(tenant.right_to_rent_expiry)
      if (days < 0)   return <span className="crystal-pill expired" style={{ fontSize: 10.5 }}>Expired</span>
      if (days <= 90) return <span className="crystal-pill warn" style={{ fontSize: 10.5 }}>Expiring ({days}d)</span>
    }
    return <span className="crystal-pill warn" style={{ fontSize: 10.5 }}>Time Limited</span>
  }
  return <span className="crystal-pill healthy" style={{ fontSize: 10.5 }}>UK / Settled</span>
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="crystal-pill healthy dot" style={{ fontSize: 10.5 }}>Active</span>
    : <span className="crystal-pill void" style={{ fontSize: 10.5 }}>Inactive</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const params  = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!orgSlug) return
    setLoading(true)
    const supabase = createClient()

    const { data: org } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (!org) { setLoading(false); return }

    const { data } = await supabase
      .from('tenants')
      .select(`
        id, first_name, last_name, email, phone,
        right_to_rent_status, right_to_rent_expiry, is_active,
        tenancy_tenants (
          tenancies (
            status,
            units ( unit_ref, properties ( name ) )
          )
        )
      `)
      .eq('org_id', org.id)
      .order('last_name', { ascending: true })

    setTenants((data as unknown as TenantRow[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  const activeCount = tenants.filter(t => t.is_active).length
  const subtitle    = loading
    ? 'Loading…'
    : `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} · ${activeCount} active`

  // ── Shared styles ─────────────────────────────────────────────────────────

  const thStyle: React.CSSProperties = {
    padding: '0 12px 10px',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: 'var(--text-mute)',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  const tdBase: React.CSSProperties = {
    padding: '11px 12px',
    fontSize: 12,
    borderBottom: '1px solid var(--border)',
  }

  return (
    <AppShell title="Tenants" subtitle={subtitle} action={{ label: 'Add Tenant' }}>
      <PageWrapper>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading tenants…</p>
          </div>
        ) : tenants.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No tenants</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Add a tenancy to create tenant records.</p>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            overflow: 'hidden',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={thStyle}>Name</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Current Tenancy</th>
                  <th style={thStyle}>Right to Rent</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <motion.tbody variants={stagger} initial="hidden" animate="visible">
                {tenants.map((tenant, i) => {
                  const tenancy = currentTenancy(tenant)
                  return (
                    <motion.tr
                      key={tenant.id}
                      variants={row}
                      className="crystal-table-row"
                      style={{ borderBottom: i < tenants.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      {/* Avatar + name */}
                      <td style={{ ...tdBase }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                            background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px var(--glow-i)',
                          }}>
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#fff' }}>
                              {initials(tenant.first_name, tenant.last_name)}
                            </span>
                          </div>
                          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {tenant.first_name} {tenant.last_name}
                          </span>
                        </div>
                      </td>

                      <td style={{ ...tdBase, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {tenant.email ?? '—'}
                      </td>

                      <td style={{ ...tdBase }}>
                        {tenancy ? (
                          <>
                            <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>
                              {tenancy.properties?.name ?? '—'}
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>
                              {tenancy.unit_ref}
                            </p>
                          </>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>No active tenancy</span>
                        )}
                      </td>

                      <td style={{ ...tdBase }}>
                        <RightToRentBadge tenant={tenant} />
                      </td>

                      <td style={{ ...tdBase }}>
                        <ActiveBadge isActive={tenant.is_active} />
                      </td>
                    </motion.tr>
                  )
                })}
              </motion.tbody>
            </table>
          </div>
        )}
      </PageWrapper>
    </AppShell>
  )
}
