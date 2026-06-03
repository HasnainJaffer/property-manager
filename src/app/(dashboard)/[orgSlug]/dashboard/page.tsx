'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconAlertTriangle } from '@tabler/icons-react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverdueChargeRow {
  id: string
  amount: number
  paid_amount: number
  due_date: string
  tenancies: {
    tenancy_tenants: Array<{
      is_lead: boolean
      tenants: { first_name: string; last_name: string } | null
    }>
    units: { unit_ref: string; properties: { name: string } | null } | null
  } | null
}

interface CertRow {
  id: string
  certificate_type: string
  expiry_date: string | null
  status: string
  properties: { name: string } | null
}

interface RenewalRow {
  id: string
  status: string
  end_date: string | null
  units: { unit_ref: string; properties: { name: string } | null } | null
  tenancy_tenants: Array<{
    is_lead: boolean
    tenants: { first_name: string; last_name: string } | null
  }>
}

// ─── Hooks & Helpers ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [count, setCount] = useState(0)
  const rafRef = useRef<number>(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])
  return count
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr); end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function certTypeLabel(type: string): string {
  const map: Record<string, string> = {
    gas_safety: 'Gas Safety', eicr: 'EICR', epc: 'EPC',
    fire_risk: 'Fire Risk', legionella: 'Legionella',
    pat_testing: 'PAT Testing', asbestos: 'Asbestos', other: 'Other',
  }
  return map[type] ?? type
}

function overdueLeadName(row: OverdueChargeRow): string {
  if (!row.tenancies) return '—'
  const lead = row.tenancies.tenancy_tenants.find(t => t.is_lead) ?? row.tenancies.tenancy_tenants[0]
  return lead?.tenants ? `${lead.tenants.first_name} ${lead.tenants.last_name}` : '—'
}

function renewalLeadName(row: RenewalRow): string {
  const lead = row.tenancy_tenants.find(t => t.is_lead) ?? row.tenancy_tenants[0]
  return lead?.tenants ? `${lead.tenants.first_name} ${lead.tenants.last_name}` : '—'
}

// ─── Animations ───────────────────────────────────────────────────────────────

const stagger = { visible: { transition: { staggerChildren: 0.045 } } }
const item    = {
  hidden:  { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16 } },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 12 }}>
      {children}
    </p>
  )
}

function TableHead({ cols }: { cols: { label: string; align?: 'left' | 'right' }[] }) {
  return (
    <thead>
      <tr style={{ borderBottom: '1px solid var(--border)' }}>
        {cols.map(c => (
          <th
            key={c.label}
            style={{
              paddingBottom: 8, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--text-mute)',
              textAlign: c.align ?? 'left',
            }}
          >
            {c.label}
          </th>
        ))}
      </tr>
    </thead>
  )
}

function EmptyRow({ cols, message }: { cols: number; message: string }) {
  return (
    <tr>
      <td colSpan={cols} style={{ padding: '24px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-mute)' }}>
        {message}
      </td>
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [loading, setLoading]             = useState(true)
  const [monthTotal, setMonthTotal]       = useState(0)
  const [monthCollected, setMonthCollected] = useState(0)
  const [arrears, setArrears]             = useState(0)
  const [arrearsCount, setArrearsCount]   = useState(0)
  const [voidCount, setVoidCount]         = useState(0)
  const [totalUnits, setTotalUnits]       = useState(0)
  const [expiringCount, setExpiringCount] = useState(0)
  const [activeCount, setActiveCount]     = useState(0)
  const [certs, setCerts]                 = useState<CertRow[]>([])
  const [renewals, setRenewals]           = useState<RenewalRow[]>([])
  const [overdueCharges, setOverdueCharges] = useState<OverdueChargeRow[]>([])
  const [monthLabel, setMonthLabel]       = useState('')

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

    const now = new Date()
    setMonthLabel(now.toLocaleString('en-GB', { month: 'long', year: 'numeric' }))

    const todayStr  = now.toISOString().split('T')[0]
    const yr        = now.getFullYear()
    const mo        = now.getMonth() + 1
    const firstDay  = `${yr}-${String(mo).padStart(2, '0')}-01`
    const lastDay   = `${yr}-${String(mo).padStart(2, '0')}-${String(new Date(yr, mo, 0).getDate()).padStart(2, '0')}`
    const in60Str   = new Date(now.getTime() + 60 * 864e5).toISOString().split('T')[0]
    const in90Str   = new Date(now.getTime() + 90 * 864e5).toISOString().split('T')[0]

    const [
      monthChargesRes,
      overdueChargesRes,
      voidUnitsRes,
      totalUnitsRes,
      expiringRes,
      activeRes,
      certsRes,
      renewalsRes,
    ] = await Promise.all([
      supabase
        .from('charges')
        .select('amount, paid_amount, status')
        .eq('org_id', org.id)
        .gte('due_date', firstDay)
        .lte('due_date', lastDay)
        .neq('status', 'waived'),

      supabase
        .from('charges')
        .select(`
          id, amount, paid_amount, due_date,
          tenancies (
            tenancy_tenants ( is_lead, tenants ( first_name, last_name ) ),
            units ( unit_ref, properties ( name ) )
          )
        `)
        .eq('org_id', org.id)
        .eq('status', 'overdue')
        .order('due_date', { ascending: true })
        .limit(5),

      supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'vacant')
        .eq('is_active', true),

      supabase
        .from('units')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('is_active', true),

      supabase
        .from('tenancies')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'active')
        .not('end_date', 'is', null)
        .gte('end_date', todayStr)
        .lte('end_date', in60Str),

      supabase
        .from('tenancies')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .in('status', ['active', 'periodic', 'in_notice']),

      supabase
        .from('certificates')
        .select('id, certificate_type, expiry_date, status, properties ( name )')
        .eq('org_id', org.id)
        .in('status', ['expired', 'expiring_soon'])
        .order('expiry_date', { ascending: true })
        .limit(5),

      supabase
        .from('tenancies')
        .select(`
          id, status, end_date,
          units ( unit_ref, properties ( name ) ),
          tenancy_tenants ( is_lead, tenants ( first_name, last_name ) )
        `)
        .eq('org_id', org.id)
        .in('status', ['active', 'periodic'])
        .limit(20),
    ])

    // Month financials
    const mCharges = monthChargesRes.data ?? []
    setMonthTotal(mCharges.reduce((s, c) => s + c.amount, 0))
    setMonthCollected(mCharges.reduce((s, c) => s + c.paid_amount, 0))

    // Arrears
    const oCharges = (overdueChargesRes.data ?? []) as unknown as OverdueChargeRow[]
    setArrears(oCharges.reduce((s, c) => s + (c.amount - c.paid_amount), 0))
    setArrearsCount(oCharges.length)
    setOverdueCharges(oCharges)

    // Units
    setVoidCount(voidUnitsRes.count ?? 0)
    setTotalUnits(totalUnitsRes.count ?? 0)

    // Tenancies
    setExpiringCount(expiringRes.count ?? 0)
    setActiveCount(activeRes.count ?? 0)

    // Compliance
    setCerts((certsRes.data ?? []) as unknown as CertRow[])

    // Renewals — filter active (expiring ≤90d) + all periodic, sort by end_date
    const allRenewals = (renewalsRes.data ?? []) as unknown as RenewalRow[]
    const filtered = allRenewals
      .filter(t => t.status === 'periodic' || (t.end_date && daysUntil(t.end_date) <= 90))
      .sort((a, b) => {
        if (!a.end_date) return 1
        if (!b.end_date) return -1
        return new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
      })
      .slice(0, 5)
    setRenewals(filtered)

    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  // Derived
  const outstanding    = monthTotal - monthCollected
  const collectedPct   = monthTotal > 0 ? Math.round((monthCollected / monthTotal) * 100) : 0
  const expiredCount   = certs.filter(c => c.status === 'expired').length
  const hasAlert       = expiredCount > 0 || certs.some(c => c.status === 'expiring_soon')

  // Animated KPI values
  const rentRollAnim   = useCountUp(monthTotal)
  const arrearsAnim    = useCountUp(arrears)
  const voidsAnim      = useCountUp(voidCount)
  const expiringAnim   = useCountUp(expiringCount)

  const subtitle = loading
    ? 'Loading…'
    : `${activeCount} active tenancies · ${voidCount} void unit${voidCount !== 1 ? 's' : ''}`

  // ─── Shared card style ───────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 14,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.3)',
  }

  return (
    <AppShell title="Dashboard" subtitle={subtitle}>
      <PageWrapper>

        {/* ── Alert banner ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {!loading && hasAlert && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(251,191,36,0.08)',
                border: '1px solid rgba(251,191,36,0.28)',
                fontSize: 12,
              }}>
                <IconAlertTriangle size={14} strokeWidth={1.75} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                <p style={{ flex: 1, color: 'var(--text-dim)', margin: 0 }}>
                  {expiredCount > 0
                    ? `${expiredCount} compliance certificate${expiredCount !== 1 ? 's have' : ' has'} expired and need immediate renewal.`
                    : 'Compliance certificates are expiring soon — review before they lapse.'
                  }
                </p>
                <Link
                  href={`/${orgSlug}/compliance`}
                  style={{ color: 'var(--amber)', fontWeight: 500, whiteSpace: 'nowrap', textDecoration: 'none', fontSize: 12 }}
                >
                  View →
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── KPI cards ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>

          {/* Monthly Rent Roll */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>
              Monthly Rent Roll
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
              £{rentRollAnim.toLocaleString('en-GB')}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              {activeCount} active tenancies
            </p>
          </div>

          {/* Arrears */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>
              Arrears
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, color: arrears > 0 ? 'var(--rose)' : 'var(--mint)', lineHeight: 1.1 }}>
              £{arrearsAnim.toLocaleString('en-GB')}
            </p>
            <p style={{ fontSize: 11, color: arrears > 0 ? 'var(--rose)' : 'var(--text-dim)', marginTop: 4, opacity: arrears > 0 ? 0.8 : 1 }}>
              {arrearsCount > 0 ? `${arrearsCount} tenant${arrearsCount !== 1 ? 's' : ''} overdue` : 'All payments up to date'}
            </p>
          </div>

          {/* Void Units */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>
              Void Units
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, color: voidCount > 0 ? 'var(--amber)' : 'var(--mint)', lineHeight: 1.1 }}>
              {voidsAnim}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              of {totalUnits} unit{totalUnits !== 1 ? 's' : ''} vacant
            </p>
          </div>

          {/* Expiring Soon */}
          <div style={{ ...cardStyle, padding: '16px 20px' }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>
              Expiring Soon
            </p>
            <p style={{ fontSize: 24, fontWeight: 600, color: expiringCount > 0 ? 'var(--amber)' : 'var(--text)', lineHeight: 1.1 }}>
              {expiringAnim}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
              within 60 days
            </p>
          </div>

        </div>

        {/* ── Two-column lower section ─────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* ── Left: Rent Collection ──────────────────────────────────────── */}
          <div style={{ ...cardStyle, padding: 20 }}>
            <SectionHeading>Rent Collection — {monthLabel}</SectionHeading>

            {/* Month stats */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Due</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  £{monthTotal.toLocaleString('en-GB')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Collected</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--mint)' }}>
                  £{monthCollected.toLocaleString('en-GB')}
                </p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Outstanding</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: outstanding > 0 ? 'var(--rose)' : 'var(--text-dim)' }}>
                  £{outstanding.toLocaleString('en-GB')}
                </p>
              </div>
              <p style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-mute)', alignSelf: 'flex-end', paddingBottom: 2 }}>
                {collectedPct}%
              </p>
            </div>

            {/* Progress bar */}
            <div className="crystal-progress" style={{ marginBottom: 20 }}>
              <motion.div
                className="crystal-progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${collectedPct}%` }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            </div>

            {/* Overdue table */}
            <SectionHeading>Overdue Payments</SectionHeading>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <TableHead cols={[
                { label: 'Tenant' },
                { label: 'Property / Unit' },
                { label: 'Due', align: 'right' },
                { label: 'Amount', align: 'right' },
                { label: 'Age', align: 'right' },
              ]} />
              <motion.tbody variants={stagger} initial="hidden" animate="visible">
                {overdueCharges.length === 0
                  ? <EmptyRow cols={5} message="No overdue payments" />
                  : overdueCharges.map(charge => {
                    const daysOld = Math.abs(daysUntil(charge.due_date))
                    return (
                      <motion.tr
                        key={charge.id}
                        variants={item}
                        className="crystal-table-row"
                        style={{ borderBottom: '1px solid var(--border)' }}
                      >
                        <td style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {overdueLeadName(charge)}
                        </td>
                        <td style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-dim)' }}>
                          {charge.tenancies?.units?.properties?.name ?? '—'}
                          {charge.tenancies?.units?.unit_ref && (
                            <span style={{ opacity: 0.6 }}> · {charge.tenancies.units.unit_ref}</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 0 10px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {fmtDate(charge.due_date)}
                        </td>
                        <td style={{ padding: '10px 0 10px 16px', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          £{charge.amount.toLocaleString('en-GB')}
                        </td>
                        <td style={{ padding: '10px 0 10px 12px', textAlign: 'right' }}>
                          <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>
                            {daysOld}d
                          </span>
                        </td>
                      </motion.tr>
                    )
                  })
                }
              </motion.tbody>
            </table>
          </div>

          {/* ── Right: Compliance + Renewals ──────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Compliance alerts */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading>Compliance Alerts</SectionHeading>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead cols={[
                  { label: 'Certificate' },
                  { label: 'Property' },
                  { label: 'Expiry', align: 'right' },
                  { label: 'Status', align: 'right' },
                ]} />
                <motion.tbody variants={stagger} initial="hidden" animate="visible">
                  {certs.length === 0
                    ? <EmptyRow cols={4} message={loading ? 'Loading…' : 'All certificates are valid'} />
                    : certs.map(cert => {
                      const expired = cert.status === 'expired'
                      const days    = cert.expiry_date ? daysUntil(cert.expiry_date) : null
                      return (
                        <motion.tr
                          key={cert.id}
                          variants={item}
                          className="crystal-table-row"
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <td style={{ padding: '10px 0', fontSize: 12, color: 'var(--text)' }}>
                            {certTypeLabel(cert.certificate_type)}
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-dim)' }}>
                            {cert.properties?.name ?? '—'}
                          </td>
                          <td style={{ padding: '10px 0 10px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {cert.expiry_date ? fmtDate(cert.expiry_date) : '—'}
                          </td>
                          <td style={{ padding: '10px 0 10px 12px', textAlign: 'right' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <span style={{
                                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                                background: expired ? 'var(--rose)' : 'var(--amber)',
                              }} />
                              <span className={`crystal-pill ${expired ? 'arrears' : 'warn'}`} style={{ fontSize: 10.5 }}>
                                {expired ? 'Expired' : days !== null ? `${days}d left` : 'Expiring'}
                              </span>
                            </span>
                          </td>
                        </motion.tr>
                      )
                    })
                  }
                </motion.tbody>
              </table>
            </div>

            {/* Upcoming renewals */}
            <div style={{ ...cardStyle, padding: 20 }}>
              <SectionHeading>Upcoming Renewals</SectionHeading>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <TableHead cols={[
                  { label: 'Tenant' },
                  { label: 'Unit' },
                  { label: 'End Date', align: 'right' },
                  { label: 'Status', align: 'right' },
                ]} />
                <motion.tbody variants={stagger} initial="hidden" animate="visible">
                  {renewals.length === 0
                    ? <EmptyRow cols={4} message={loading ? 'Loading…' : 'No upcoming renewals'} />
                    : renewals.map(t => {
                      const days = t.end_date ? daysUntil(t.end_date) : null
                      const periodic = t.status === 'periodic'
                      return (
                        <motion.tr
                          key={t.id}
                          variants={item}
                          className="crystal-table-row"
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <td style={{ padding: '10px 0', fontSize: 12, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {renewalLeadName(t)}
                          </td>
                          <td style={{ padding: '10px 8px', fontSize: 11, color: 'var(--text-dim)' }}>
                            {t.units?.properties?.name ?? '—'}
                            {t.units?.unit_ref && <span style={{ opacity: 0.6 }}> · {t.units.unit_ref}</span>}
                          </td>
                          <td style={{ padding: '10px 0 10px 8px', fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {t.end_date ? fmtDate(t.end_date) : '—'}
                          </td>
                          <td style={{ padding: '10px 0 10px 12px', textAlign: 'right' }}>
                            {periodic ? (
                              <span className="crystal-pill" style={{ fontSize: 10.5, color: 'var(--indigo)', borderColor: 'rgba(129,140,248,.3)', background: 'rgba(129,140,248,.1)' }}>
                                Periodic
                              </span>
                            ) : days !== null && days <= 30 ? (
                              <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>
                                {days}d left
                              </span>
                            ) : (
                              <span className="crystal-pill warn" style={{ fontSize: 10.5 }}>
                                {days}d left
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      )
                    })
                  }
                </motion.tbody>
              </table>
            </div>

          </div>
        </div>
      </PageWrapper>
    </AppShell>
  )
}
