'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenancyRow {
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
  units: {
    unit_ref: string
    properties: { name: string } | null
  } | null
  tenancy_tenants: Array<{
    is_lead: boolean
    tenants: { first_name: string; last_name: string } | null
  }>
}

type FilterTab = 'all' | 'active' | 'expiring' | 'periodic' | 'ended'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr); end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isExpiring(t: TenancyRow): boolean {
  return t.status === 'active' && !!t.end_date && daysUntil(t.end_date) <= 60
}

function leadTenantName(row: TenancyRow): string {
  const lead = row.tenancy_tenants.find(t => t.is_lead) ?? row.tenancy_tenants[0]
  if (!lead?.tenants) return '—'
  return `${lead.tenants.first_name} ${lead.tenants.last_name}`
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'periodic', label: 'Periodic' },
  { key: 'ended',    label: 'Ended' },
]

function applyFilter(tenancies: TenancyRow[], tab: FilterTab): TenancyRow[] {
  switch (tab) {
    case 'active':   return tenancies.filter(t => t.status === 'active')
    case 'expiring': return tenancies.filter(t => isExpiring(t))
    case 'periodic': return tenancies.filter(t => t.status === 'periodic')
    case 'ended':    return tenancies.filter(t => t.status === 'ended' || t.status === 'cancelled')
    default:         return tenancies
  }
}

// ─── Animations ───────────────────────────────────────────────────────────────

const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const row     = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ t }: { t: TenancyRow }) {
  const exp = isExpiring(t)
  if (t.status === 'active') {
    return exp
      ? <span className="crystal-pill warn dot" style={{ fontSize: 10.5 }}>Expiring</span>
      : <span className="crystal-pill healthy dot" style={{ fontSize: 10.5 }}>Active</span>
  }
  if (t.status === 'periodic')  return <span className="crystal-pill dot" style={{ fontSize: 10.5, color: 'var(--indigo)', borderColor: 'rgba(129,140,248,.3)', background: 'rgba(129,140,248,.08)' }}>Periodic</span>
  if (t.status === 'in_notice') return <span className="crystal-pill warn dot" style={{ fontSize: 10.5 }}>In Notice</span>
  if (t.status === 'ended')     return <span className="crystal-pill void" style={{ fontSize: 10.5 }}>Ended</span>
  if (t.status === 'cancelled') return <span className="crystal-pill void" style={{ fontSize: 10.5 }}>Cancelled</span>
  return null
}

function DepositBadge({ t }: { t: TenancyRow }) {
  if (!t.deposit_amount) return null
  return t.deposit_registered_date
    ? <span className="crystal-pill ok" style={{ fontSize: 10 }}>Protected</span>
    : <span className="crystal-pill arrears" style={{ fontSize: 10 }}>Unprotected</span>
}

function EndDateCell({ t }: { t: TenancyRow }) {
  if (!t.end_date) {
    return <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Rolling</span>
  }
  const days   = daysUntil(t.end_date)
  const urgent = days < 30
  const warn   = days >= 0 && days < 60
  const color  = urgent ? 'var(--rose)' : warn ? 'var(--amber)' : 'var(--text-dim)'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>
      {fmtDate(t.end_date)}
      {warn && (
        <span style={{ marginLeft: 6, fontSize: 10, fontFamily: 'inherit', opacity: 0.8 }}>
          ({days}d)
        </span>
      )}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenanciesPage() {
  const params  = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [tenancies, setTenancies] = useState<TenancyRow[]>([])
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState<FilterTab>('all')

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
      .from('tenancies')
      .select(`
        id, status, tenancy_type, rent_amount, rent_frequency,
        start_date, end_date, deposit_amount, deposit_scheme, deposit_registered_date,
        units ( unit_ref, properties ( name ) ),
        tenancy_tenants ( is_lead, tenants ( first_name, last_name ) )
      `)
      .eq('org_id', org.id)
      .order('start_date', { ascending: false })

    setTenancies((data as unknown as TenancyRow[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  const activeCount   = tenancies.filter(t => ['active', 'periodic', 'in_notice'].includes(t.status)).length
  const expiringCount = tenancies.filter(t => isExpiring(t)).length
  const filtered      = applyFilter(tenancies, tab)

  const subtitle = loading
    ? 'Loading…'
    : `${activeCount} active · ${expiringCount} expiring within 60 days`

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
    <AppShell title="Tenancies" subtitle={subtitle} action={{ label: 'New Tenancy' }}>
      <PageWrapper>

        {/* ── Filter tabs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {TABS.map(t => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: '8px 12px',
                  fontSize: 12.5,
                  fontWeight: active ? 500 : 400,
                  color: active ? 'var(--text)' : 'var(--text-dim)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${active ? 'var(--indigo)' : 'transparent'}`,
                  marginBottom: -1,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'color .15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-dim)' }}
              >
                {t.label}
                {t.key === 'expiring' && !loading && expiringCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 18, height: 16, padding: '0 4px', borderRadius: 5,
                    fontSize: 10, fontWeight: 500,
                    background: 'rgba(251,191,36,.15)', color: 'var(--amber)',
                  }}>
                    {expiringCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Table ───────────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading tenancies…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No tenancies</p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {tab === 'all' ? 'Add a tenancy to get started.' : 'No tenancies match this filter.'}
              </p>
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
                  <th style={thStyle}>Tenant</th>
                  <th style={thStyle}>Property / Unit</th>
                  <th style={thStyle}>Rent</th>
                  <th style={thStyle}>Start</th>
                  <th style={thStyle}>End</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Deposit</th>
                </tr>
              </thead>
              <motion.tbody variants={stagger} initial="hidden" animate="visible">
                {filtered.map((t, i) => (
                  <motion.tr
                    key={t.id}
                    variants={row}
                    className="crystal-table-row"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none' }}
                  >
                    <td style={{ ...tdBase, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {leadTenantName(t)}
                    </td>
                    <td style={{ ...tdBase, color: 'var(--text-dim)' }}>
                      <p style={{ margin: 0, color: 'var(--text)', fontSize: 12 }}>
                        {t.units?.properties?.name ?? '—'}
                      </p>
                      {t.units?.unit_ref && (
                        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>
                          {t.units.unit_ref}
                        </p>
                      )}
                    </td>
                    <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 12 }}>
                        £{t.rent_amount.toLocaleString('en-GB')}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-mute)', marginLeft: 2 }}>/mo</span>
                    </td>
                    <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      {fmtDate(t.start_date)}
                    </td>
                    <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                      <EndDateCell t={t} />
                    </td>
                    <td style={{ ...tdBase }}>
                      <StatusBadge t={t} />
                    </td>
                    <td style={{ ...tdBase }}>
                      <DepositBadge t={t} />
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>
        )}
      </PageWrapper>
    </AppShell>
  )
}
