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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function isExpiring(t: TenancyRow): boolean {
  if (t.status !== 'active' || !t.end_date) return false
  return daysUntil(t.end_date) <= 60
}

function leadTenantName(row: TenancyRow): string {
  const lead = row.tenancy_tenants.find(t => t.is_lead) ?? row.tenancy_tenants[0]
  if (!lead?.tenants) return '—'
  return `${lead.tenants.first_name} ${lead.tenants.last_name}`
}

// ─── Animations ───────────────────────────────────────────────────────────────

const containerVariants = {
  visible: { transition: { staggerChildren: 0.04 } },
}
const rowVariants = {
  hidden: { opacity: 0, y: 3 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
}

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ row }: { row: TenancyRow }) {
  const exp = isExpiring(row)
  if (row.status === 'active') {
    return exp
      ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Expiring</span>
      : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
  }
  if (row.status === 'periodic') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Periodic</span>
  }
  if (row.status === 'in_notice') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">In Notice</span>
  }
  if (row.status === 'ended') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Ended</span>
  }
  if (row.status === 'cancelled') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Cancelled</span>
  }
  return null
}

function DepositBadge({ row }: { row: TenancyRow }) {
  if (!row.deposit_amount) return null
  return row.deposit_registered_date
    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Protected</span>
    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Unprotected</span>
}

function EndDateCell({ row }: { row: TenancyRow }) {
  if (!row.end_date) {
    return <span className="text-[11px] text-gray-400 dark:text-gray-500">Rolling</span>
  }
  const days = daysUntil(row.end_date)
  const urgent = days < 30
  const warning = days >= 0 && days < 60
  const cls = urgent
    ? 'text-red-600 dark:text-red-400'
    : warning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-700 dark:text-gray-300'
  return (
    <span className={`font-mono text-[11px] ${cls}`}>
      {fmtDate(row.end_date)}
      {warning && (
        <span className="ml-1.5 text-[10px] font-sans font-normal opacity-80">
          ({days}d)
        </span>
      )}
    </span>
  )
}

// ─── Filter tab helpers ───────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenanciesPage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [tenancies, setTenancies] = useState<TenancyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>('all')

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
        units (
          unit_ref,
          properties ( name )
        ),
        tenancy_tenants (
          is_lead,
          tenants ( first_name, last_name )
        )
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

  return (
    <AppShell title="Tenancies" subtitle={subtitle} action={{ label: 'New Tenancy' }}>
      <PageWrapper>
        <div className="p-6">
          {/* Filter tabs */}
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 mb-4">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key
                    ? 'border-gray-900 dark:border-gray-100 text-gray-900 dark:text-gray-100'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {t.label}
                {t.key === 'expiring' && !loading && expiringCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-[18px] h-[14px] rounded text-[9px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {expiringCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-[12px] text-gray-400">Loading tenancies…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">No tenancies</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">
                  {tab === 'all' ? 'Add a tenancy to get started.' : 'No tenancies match this filter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Tenant</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Property / Unit</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Rent</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Start</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">End</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Status</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Deposit</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {filtered.map((t, i) => (
                    <motion.tr
                      key={t.id}
                      variants={rowVariants}
                      className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                        i < filtered.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-[12px] font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                        {leadTenantName(t)}
                      </td>
                      <td className="py-2.5 px-4">
                        <p className="text-[12px] text-gray-700 dark:text-gray-300">
                          {t.units?.properties?.name ?? '—'}
                        </p>
                        {t.units?.unit_ref && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {t.units.unit_ref}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="text-[12px] font-mono text-gray-700 dark:text-gray-300">
                          £{t.rent_amount.toLocaleString('en-GB')}
                        </span>
                        <span className="text-[10px] text-gray-400 font-sans">/mo</span>
                      </td>
                      <td className="py-2.5 px-4 text-[11px] font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {fmtDate(t.start_date)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <EndDateCell row={t} />
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge row={t} />
                      </td>
                      <td className="py-2.5 px-4">
                        <DepositBadge row={t} />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  )
}
