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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function currentTenancy(row: TenantRow) {
  const active = row.tenancy_tenants.find(tt => {
    const s = tt.tenancies?.status
    return s === 'active' || s === 'periodic' || s === 'in_notice'
  })
  if (!active?.tenancies?.units) return null
  return active.tenancies.units
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

function RightToRentBadge({ row }: { row: TenantRow }) {
  const status = row.right_to_rent_status
  if (!status || status === 'not_applicable') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">N/A</span>
  }
  if (status === 'not_checked') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Not Checked</span>
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Failed</span>
  }
  if (status === 'time_limited') {
    if (row.right_to_rent_expiry) {
      const days = daysUntil(row.right_to_rent_expiry)
      if (days < 0) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Expired</span>
      }
      if (days <= 90) {
        return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Expiring ({days}d)</span>
      }
    }
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Time Limited</span>
  }
  // unlimited
  return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">UK / Settled</span>
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Active</span>
    : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Inactive</span>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantsPage() {
  const params = useParams()
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
            units (
              unit_ref,
              properties ( name )
            )
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
  const subtitle = loading
    ? 'Loading…'
    : `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} · ${activeCount} active`

  return (
    <AppShell title="Tenants" subtitle={subtitle} action={{ label: 'Add Tenant' }}>
      <PageWrapper>
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <p className="text-[12px] text-gray-400">Loading tenants…</p>
            </div>
          ) : tenants.length === 0 ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <div className="text-center">
                <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">No tenants</p>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">Add a tenancy to create tenant records.</p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Name</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Email</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Current Tenancy</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Right to Rent</th>
                    <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                  {tenants.map((tenant, i) => {
                    const tenancy = currentTenancy(tenant)
                    return (
                      <motion.tr
                        key={tenant.id}
                        variants={rowVariants}
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                          i < tenants.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                        }`}
                      >
                        {/* Avatar + name */}
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300">
                                {initials(tenant.first_name, tenant.last_name)}
                              </span>
                            </div>
                            <span className="text-[12px] font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {tenant.first_name} {tenant.last_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-[12px] text-gray-500 dark:text-gray-400">
                          {tenant.email ?? '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          {tenancy ? (
                            <>
                              <p className="text-[12px] text-gray-700 dark:text-gray-300">
                                {tenancy.properties?.name ?? '—'}
                              </p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                                {tenancy.unit_ref}
                              </p>
                            </>
                          ) : (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500">No active tenancy</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <RightToRentBadge row={tenant} />
                        </td>
                        <td className="py-2.5 px-4">
                          <ActiveBadge isActive={tenant.is_active} />
                        </td>
                      </motion.tr>
                    )
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </div>
      </PageWrapper>
    </AppShell>
  )
}
