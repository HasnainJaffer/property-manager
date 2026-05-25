'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChargeRow {
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
    units: {
      unit_ref: string
      properties: { name: string } | null
    } | null
  } | null
}

interface ActiveTenancy {
  id: string
  lead_name: string
  property_unit: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(n: number) {
  return `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long', year: 'numeric' })
}

function leadTenantName(charge: ChargeRow): string {
  if (!charge.tenancies) return '—'
  const lead = charge.tenancies.tenancy_tenants.find(t => t.is_lead) ?? charge.tenancies.tenancy_tenants[0]
  if (!lead?.tenants) return '—'
  return `${lead.tenants.first_name} ${lead.tenants.last_name}`
}

function propertyUnit(charge: ChargeRow): string {
  if (!charge.tenancies?.units) return '—'
  const { unit_ref, properties } = charge.tenancies.units
  return properties ? `${properties.name} · ${unit_ref}` : unit_ref
}

// ─── Animations ───────────────────────────────────────────────────────────────

const containerVariants = {
  visible: { transition: { staggerChildren: 0.04 } },
}
const rowVariants = {
  hidden: { opacity: 0, y: 3 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.15 } },
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Paid</span>
  )
  if (status === 'partial') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Partial</span>
  )
  if (status === 'overdue') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Overdue</span>
  )
  if (status === 'waived') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Waived</span>
  )
  if (status === 'cancelled') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Cancelled</span>
  )
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Pending</span>
  )
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({
  orgId,
  tenancies,
  onClose,
  onRecorded,
}: {
  orgId: string
  tenancies: ActiveTenancy[]
  onClose: () => void
  onRecorded: () => void
}) {
  const [form, setForm] = useState({
    tenancy_id: tenancies[0]?.id ?? '',
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    reference: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tenancy_id || !form.amount) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const amount = parseFloat(form.amount)

    // Insert payment (org_id synced via trigger)
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        org_id: orgId,
        tenancy_id: form.tenancy_id,
        amount,
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        reference: form.reference.trim() || null,
      })
      .select('id')
      .single()

    if (payErr || !payment) {
      setError(payErr?.message ?? 'Failed to record payment')
      setLoading(false)
      return
    }

    // Auto-allocate to oldest outstanding charges
    const { data: outstanding } = await supabase
      .from('charges')
      .select('id, amount, paid_amount')
      .eq('tenancy_id', form.tenancy_id)
      .in('status', ['pending', 'overdue', 'partial'])
      .order('due_date', { ascending: true })

    if (outstanding?.length) {
      let remaining = amount
      for (const charge of outstanding) {
        if (remaining <= 0) break
        const balance = charge.amount - charge.paid_amount
        const allocate = Math.min(remaining, balance)
        await supabase.from('payment_allocations').insert({
          payment_id: payment.id,
          charge_id: charge.id,
          amount_allocated: allocate,
        })
        remaining -= allocate
      }
    }

    onRecorded()
  }

  const inputClass =
    'w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors'
  const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Record payment</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className={labelClass}>Tenancy <span className="text-red-500">*</span></label>
            <select
              required
              value={form.tenancy_id}
              onChange={e => set('tenancy_id', e.target.value)}
              className={inputClass}
            >
              {tenancies.map(t => (
                <option key={t.id} value={t.id}>{t.lead_name} — {t.property_unit}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Amount <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">£</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  placeholder="950.00"
                  className={`${inputClass} pl-5`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Date <span className="text-red-500">*</span></label>
              <input
                required
                type="date"
                value={form.payment_date}
                onChange={e => set('payment_date', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Method</label>
            <select
              value={form.payment_method}
              onChange={e => set('payment_method', e.target.value)}
              className={inputClass}
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="standing_order">Standing Order</option>
              <option value="direct_debit">Direct Debit</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Reference</label>
            <input
              value={form.reference}
              onChange={e => set('reference', e.target.value)}
              placeholder="e.g. MITCHELL MAY"
              className={inputClass}
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 rounded bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      <p className={`text-[22px] font-medium font-mono leading-none ${valueColor ?? 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RentPage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [charges, setCharges] = useState<ChargeRow[]>([])
  const [activeTenancies, setActiveTenancies] = useState<ActiveTenancy[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const year  = now.getFullYear() + Math.floor((now.getMonth() + monthOffset) / 12)
  const month = ((now.getMonth() + monthOffset) % 12 + 12) % 12 + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDayDate = new Date(year, month, 0)
  const lastDay  = `${year}-${String(month).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`

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
    setOrgId(org.id)

    // Fetch charges for the selected month
    const { data } = await supabase
      .from('charges')
      .select(`
        id, charge_type, description, due_date, amount, paid_amount, status,
        tenancies (
          id,
          tenancy_tenants (
            is_lead,
            tenants ( first_name, last_name )
          ),
          units (
            unit_ref,
            properties ( name )
          )
        )
      `)
      .eq('org_id', org.id)
      .gte('due_date', firstDay)
      .lte('due_date', lastDay)
      .order('due_date', { ascending: true })

    setCharges((data as unknown as ChargeRow[]) ?? [])

    // Fetch active tenancies for the payment modal
    const { data: tData } = await supabase
      .from('tenancies')
      .select(`
        id,
        tenancy_tenants (
          is_lead,
          tenants ( first_name, last_name )
        ),
        units (
          unit_ref,
          properties ( name )
        )
      `)
      .eq('org_id', org.id)
      .in('status', ['active', 'periodic', 'in_notice'])

    if (tData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setActiveTenancies(
        (tData as unknown as Array<{
          id: string
          tenancy_tenants: Array<{ is_lead: boolean; tenants: { first_name: string; last_name: string } | null }>
          units: { unit_ref: string; properties: { name: string } | null } | null
        }>).map(t => {
          const lead = t.tenancy_tenants.find(tt => tt.is_lead) ?? t.tenancy_tenants[0]
          const name = lead?.tenants ? `${lead.tenants.first_name} ${lead.tenants.last_name}` : '—'
          const unit = t.units ? `${t.units.properties?.name ?? ''} · ${t.units.unit_ref}` : ''
          return { id: t.id, lead_name: name, property_unit: unit }
        })
      )
    }

    setLoading(false)
  }, [orgSlug, firstDay, lastDay])

  useEffect(() => { load() }, [load])

  const totalDue      = charges.reduce((s, c) => s + c.amount, 0)
  const collected     = charges.reduce((s, c) => s + c.paid_amount, 0)
  const outstanding   = totalDue - collected
  const overdueCount  = charges.filter(c => c.status === 'overdue' || c.status === 'partial').length

  const subtitle = loading
    ? 'Loading…'
    : `${monthLabel(year, month)} · ${fmtGBP(collected)} collected of ${fmtGBP(totalDue)}`

  return (
    <>
      <AppShell
        title="Rent Ledger"
        subtitle={subtitle}
        action={{ label: 'Record Payment', onClick: () => setShowModal(true) }}
      >
        <PageWrapper>
          <div className="p-6 space-y-5">
            {/* Month navigation */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMonthOffset(o => o - 1)}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <IconChevronLeft size={14} strokeWidth={2} />
              </button>
              <span className="text-[13px] font-medium text-gray-900 dark:text-gray-100 min-w-[120px] text-center">
                {monthLabel(year, month)}
              </span>
              <button
                onClick={() => setMonthOffset(o => o + 1)}
                disabled={monthOffset >= 0}
                className="w-7 h-7 flex items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors disabled:opacity-30"
              >
                <IconChevronRight size={14} strokeWidth={2} />
              </button>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-3 gap-3">
              <KpiCard
                label="Total Due"
                value={fmtGBP(totalDue)}
                sub={`${charges.length} charge${charges.length !== 1 ? 's' : ''}`}
              />
              <KpiCard
                label="Collected"
                value={fmtGBP(collected)}
                sub={totalDue > 0 ? `${Math.round((collected / totalDue) * 100)}% of total` : undefined}
                valueColor="text-emerald-700 dark:text-emerald-400"
              />
              <KpiCard
                label="Outstanding"
                value={fmtGBP(outstanding)}
                sub={overdueCount > 0 ? `${overdueCount} overdue` : 'No overdue charges'}
                valueColor={outstanding > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}
              />
            </div>

            {/* Charges table */}
            {loading ? (
              <div className="flex items-center justify-center min-h-[200px]">
                <p className="text-[12px] text-gray-400">Loading charges…</p>
              </div>
            ) : charges.length === 0 ? (
              <div className="flex items-center justify-center min-h-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="text-center">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">No charges</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">No charges recorded for {monthLabel(year, month)}.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Tenant</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Property</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Due</th>
                      <th className="text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Amount</th>
                      <th className="text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Paid</th>
                      <th className="text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Balance</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                    {charges.map((c, i) => {
                      const balance = c.amount - c.paid_amount
                      return (
                        <motion.tr
                          key={c.id}
                          variants={rowVariants}
                          className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                            i < charges.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 text-[12px] font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {leadTenantName(c)}
                          </td>
                          <td className="py-2.5 px-4 text-[12px] text-gray-600 dark:text-gray-400">
                            {propertyUnit(c)}
                          </td>
                          <td className="py-2.5 px-4 text-[11px] font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {fmtDate(c.due_date)}
                          </td>
                          <td className="py-2.5 px-4 text-[12px] font-mono text-gray-700 dark:text-gray-300 text-right whitespace-nowrap">
                            {fmtGBP(c.amount)}
                          </td>
                          <td className="py-2.5 px-4 text-[12px] font-mono text-emerald-700 dark:text-emerald-400 text-right whitespace-nowrap">
                            {c.paid_amount > 0 ? fmtGBP(c.paid_amount) : '—'}
                          </td>
                          <td className={`py-2.5 px-4 text-[12px] font-mono text-right whitespace-nowrap ${
                            balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400 dark:text-gray-600'
                          }`}>
                            {balance > 0 ? fmtGBP(balance) : '—'}
                          </td>
                          <td className="py-2.5 px-4">
                            <StatusBadge status={c.status} />
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

      <AnimatePresence>
        {showModal && orgId && activeTenancies.length > 0 && (
          <RecordPaymentModal
            orgId={orgId}
            tenancies={activeTenancies}
            onClose={() => setShowModal(false)}
            onRecorded={() => { setShowModal(false); load() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
