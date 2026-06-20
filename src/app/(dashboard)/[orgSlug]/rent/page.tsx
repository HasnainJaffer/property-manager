'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type ChargeRow } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

const PAYMENT_METHOD_OPTIONS = [
  { value: 'bank_transfer',  label: 'Bank Transfer' },
  { value: 'standing_order', label: 'Standing Order' },
  { value: 'direct_debit',   label: 'Direct Debit' },
  { value: 'cash',           label: 'Cash' },
  { value: 'cheque',         label: 'Cheque' },
  { value: 'card',           label: 'Card' },
  { value: 'other',          label: 'Other' },
]

const CHARGE_TYPE_OPTIONS = [
  { value: 'rent',           label: 'Rent' },
  { value: 'deposit',        label: 'Deposit' },
  { value: 'deposit_return', label: 'Deposit Return' },
  { value: 'maintenance',    label: 'Maintenance' },
  { value: 'utilities',      label: 'Utilities' },
  { value: 'insurance',      label: 'Insurance' },
  { value: 'management_fee', label: 'Management Fee' },
  { value: 'legal',          label: 'Legal' },
  { value: 'other',          label: 'Other' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthSummary {
  year:      number
  month:     number
  totalDue:  number
  collected: number
  shortLabel: string
}

interface ActiveTenancy {
  id: string; lead_name: string; property_unit: string
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
  return lead?.tenants ? `${lead.tenants.first_name} ${lead.tenants.last_name}` : '—'
}

function propertyUnit(charge: ChargeRow): string {
  if (!charge.tenancies?.units) return '—'
  const { unit_ref, properties } = charge.tenancies.units
  return properties ? `${properties.name} · ${unit_ref}` : unit_ref
}

function buildMonthSummaries(rows: { due_date: string; amount: number; paid_amount: number }[]): MonthSummary[] {
  const now = new Date()
  const map = new Map<string, MonthSummary>()

  for (let i = 11; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, {
      year:       d.getFullYear(),
      month:      d.getMonth() + 1,
      totalDue:   0,
      collected:  0,
      shortLabel: d.toLocaleString('en-GB', { month: 'short' }),
    })
  }

  for (const row of rows) {
    const key     = row.due_date.slice(0, 7)
    const summary = map.get(key)
    if (summary) {
      summary.totalDue  += row.amount
      summary.collected += row.paid_amount
    }
  }

  return Array.from(map.values())
}

// ─── Animations ───────────────────────────────────────────────────────────────

const pageVariants = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }
const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const rowAnim = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'paid')      return <span className="crystal-pill healthy"  style={{ fontSize: 10.5 }}>Paid</span>
  if (status === 'partial')   return <span className="crystal-pill warn"     style={{ fontSize: 10.5 }}>Partial</span>
  if (status === 'overdue')   return <span className="crystal-pill arrears"  style={{ fontSize: 10.5 }}>Overdue</span>
  if (status === 'waived')    return <span className="crystal-pill void"     style={{ fontSize: 10.5 }}>Waived</span>
  if (status === 'cancelled') return <span className="crystal-pill void"     style={{ fontSize: 10.5 }}>Cancelled</span>
  return                             <span className="crystal-pill"          style={{ fontSize: 10.5 }}>Pending</span>
}

// ─── Bar chart ────────────────────────────────────────────────────────────────

function RentChart({
  summaries,
  selectedYear,
  selectedMonth,
  onSelect,
}: {
  summaries: MonthSummary[]
  selectedYear: number
  selectedMonth: number
  onSelect: (year: number, month: number, offset: number) => void
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  const maxTotal = Math.max(...summaries.map(s => s.totalDue), 1)
  const BAR_H    = 72 // px

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
      padding: '16px 20px 14px',
      marginBottom: 16,
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 14 }}>
        12-Month Overview
      </p>

      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: BAR_H + 28 }}>
        {summaries.map((s, i) => {
          const isSelected = s.year === selectedYear && s.month === selectedMonth
          const isHovered  = hovered === i
          const dueH  = s.totalDue  > 0 ? Math.max((s.totalDue  / maxTotal) * BAR_H, 4) : 2
          const collH = s.totalDue  > 0 ? (s.collected / s.totalDue) * dueH             : 0
          const offset = i - 11

          return (
            <div
              key={i}
              onClick={() => onSelect(s.year, s.month, offset)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Tooltip */}
              <AnimatePresence>
                {isHovered && s.totalDue > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      bottom: BAR_H + 14,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'var(--surface-3)',
                      border: '1px solid var(--border-2)',
                      borderRadius: 8,
                      padding: '7px 10px',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                      pointerEvents: 'none',
                    }}
                  >
                    <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                      {monthLabel(s.year, s.month)}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-dim)', marginBottom: 2 }}>
                      Due&nbsp;&nbsp;&nbsp;&nbsp;{fmtGBP(s.totalDue)}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--mint)', marginBottom: 2 }}>
                      Paid&nbsp;&nbsp;&nbsp;&nbsp;{fmtGBP(s.collected)}
                    </p>
                    {s.totalDue - s.collected > 0 && (
                      <p style={{ fontSize: 10, color: 'var(--rose)' }}>
                        Owed&nbsp;&nbsp;&nbsp;{fmtGBP(s.totalDue - s.collected)}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bar area */}
              <div style={{
                width: '100%',
                height: BAR_H,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
              }}>
                {/* Due bar (background) + collected overlay */}
                <div style={{
                  width: '100%',
                  height: dueH,
                  background: isSelected ? 'var(--surface-3)' : isHovered ? 'var(--surface-3)' : 'var(--surface-2)',
                  borderRadius: '4px 4px 0 0',
                  position: 'relative',
                  overflow: 'hidden',
                  border: isSelected ? '1px solid var(--indigo)' : '1px solid transparent',
                  boxSizing: 'border-box',
                  transition: 'background .15s, border-color .15s',
                }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: collH }}
                    transition={{ duration: 0.6, delay: i * 0.03, ease: 'easeOut' }}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(180deg, var(--mint), var(--cyan))',
                      borderRadius: '3px 3px 0 0',
                    }}
                  />
                </div>
              </div>

              {/* Month label */}
              <span style={{
                fontSize: 9.5,
                color: isSelected ? 'var(--indigo)' : 'var(--text-mute)',
                fontWeight: isSelected ? 600 : 400,
                letterSpacing: '0.02em',
                userSelect: 'none',
                transition: 'color .15s',
              }}>
                {s.shortLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset',
      padding: '16px 20px',
    }}>
      <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>
        {label}
      </p>
      <p style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color ?? 'var(--text)', lineHeight: 1.1 }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 5 }}>{sub}</p>}
    </div>
  )
}

// ─── Add Charge Modal ─────────────────────────────────────────────────────────

function AddChargeModal({ orgId, tenancies, onClose, onAdded }: {
  orgId: string
  tenancies: ActiveTenancy[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    tenancy_id:  tenancies[0]?.id ?? '',
    charge_type: 'rent',
    description: '',
    amount:      '',
    due_date:    new Date().toISOString().slice(0, 10),
  })
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tenancy_id || !form.amount) return
    setSaving(true); setError(null)

    const { error: err } = await createClient().from('charges').insert({
      org_id:      orgId,
      tenancy_id:  form.tenancy_id,
      charge_type: form.charge_type,
      description: form.description.trim() || null,
      amount:      parseFloat(form.amount),
      paid_amount: 0,
      due_date:    form.due_date,
      status:      'pending',
    })

    if (err) { setError(err.message); setSaving(false); return }
    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        className="crystal-modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Add charge</h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent',
              color: 'var(--text-mute)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ModalField label="Tenancy" required>
            <CrystalSelect
              value={form.tenancy_id}
              onChange={v => set('tenancy_id', v)}
              options={tenancies.map(t => ({ value: t.id, label: `${t.lead_name} — ${t.property_unit}` }))}
              placeholder="Select tenancy…"
            />
          </ModalField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModalField label="Type" required>
              <CrystalSelect value={form.charge_type} onChange={v => set('charge_type', v)} options={CHARGE_TYPE_OPTIONS} />
            </ModalField>
            <ModalField label="Due date" required>
              <CrystalDatePicker value={form.due_date} onChange={v => set('due_date', v)} />
            </ModalField>
          </div>

          <ModalField label="Amount" required>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none' }}>£</span>
              <input
                required type="number" min="0.01" step="0.01"
                className="crystal-input" style={{ paddingLeft: 22 }}
                value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="950.00"
              />
            </div>
          </ModalField>

          <ModalField label="Description">
            <input className="crystal-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="e.g. June 2026 rent" />
          </ModalField>

          {error && (
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s' }}
            >
              {saving ? 'Adding…' : 'Add charge'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Record Payment Modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ orgId, tenancies, onClose, onRecorded }: {
  orgId: string
  tenancies: ActiveTenancy[]
  onClose: () => void
  onRecorded: () => void
}) {
  const [form, setForm] = useState({
    tenancy_id:     tenancies[0]?.id ?? '',
    amount:         '',
    payment_date:   new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    reference:      '',
  })
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.tenancy_id || !form.amount) return
    setSaving(true); setError(null)

    const supabase = createClient()
    const amount   = parseFloat(form.amount)

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        org_id: orgId, tenancy_id: form.tenancy_id, amount,
        payment_date: form.payment_date, payment_method: form.payment_method,
        reference: form.reference.trim() || null,
      })
      .select('id')
      .single()

    if (payErr || !payment) {
      setError(payErr?.message ?? 'Failed to record payment')
      setSaving(false); return
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
        const balance  = charge.amount - charge.paid_amount
        const allocate = Math.min(remaining, balance)
        await supabase.from('payment_allocations').insert({
          payment_id: payment.id, charge_id: charge.id, amount_allocated: allocate,
        })
        remaining -= allocate
      }
    }

    onRecorded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        className="crystal-modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Record payment</h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent',
              color: 'var(--text-mute)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Tenancy */}
          <ModalField label="Tenancy" required>
            <CrystalSelect
              value={form.tenancy_id}
              onChange={v => set('tenancy_id', v)}
              options={tenancies.map(t => ({ value: t.id, label: `${t.lead_name} — ${t.property_unit}` }))}
              placeholder="Select tenancy…"
            />
          </ModalField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModalField label="Amount" required>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none' }}>£</span>
                <input
                  required type="number" min="0.01" step="0.01"
                  className="crystal-input" style={{ paddingLeft: 22 }}
                  value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="950.00"
                />
              </div>
            </ModalField>
            <ModalField label="Date" required>
              <CrystalDatePicker
                value={form.payment_date}
                onChange={v => set('payment_date', v)}
              />
            </ModalField>
          </div>

          <ModalField label="Method">
            <CrystalSelect
              value={form.payment_method}
              onChange={v => set('payment_method', v)}
              options={PAYMENT_METHOD_OPTIONS}
            />
          </ModalField>

          <ModalField label="Reference">
            <input className="crystal-input" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="e.g. MITCHELL MAY" />
          </ModalField>

          {error && (
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s' }}
            >
              {saving ? 'Recording…' : 'Record payment'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function ModalField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-dim)' }}>
        {label}{required && <span style={{ color: 'var(--rose)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RentPage() {
  const { orgId, charges: allCharges, tenancies, loading, refreshCharges } = useOrgData()

  const now = new Date()
  const [monthOffset,    setMonthOffset]    = useState(0)
  const [showModal,      setShowModal]      = useState(false)
  const [showAddCharge,  setShowAddCharge]  = useState(false)

  // Compute selected year/month from offset
  const targetDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const year  = targetDate.getFullYear()
  const month = targetDate.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay  = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`

  // Filter cached charges to the selected month — no network call on month switch
  const charges = allCharges.filter(c => c.due_date >= firstDay && c.due_date <= lastDay)

  // Build 12-month summaries from the full cached charge set
  const monthSummaries = buildMonthSummaries(allCharges)

  // Derive active tenancies from cached tenancy data
  const activeTenancies: ActiveTenancy[] = tenancies
    .filter(t => ['active', 'periodic', 'in_notice'].includes(t.status))
    .map(t => {
      const lead = t.tenancy_tenants.find(tt => tt.is_lead) ?? t.tenancy_tenants[0]
      const name = lead?.tenants ? `${lead.tenants.first_name} ${lead.tenants.last_name}` : '—'
      const unit = t.units ? `${t.units.properties?.name ?? ''} · ${t.units.unit_ref}` : ''
      return { id: t.id, lead_name: name, property_unit: unit }
    })

  const totalDue     = charges.reduce((s, c) => s + c.amount, 0)
  const collected    = charges.reduce((s, c) => s + c.paid_amount, 0)
  const outstanding  = totalDue - collected
  const overdueCount = charges.filter(c => c.status === 'overdue' || c.status === 'partial').length

  const subtitle = loading
    ? 'Loading…'
    : `${monthLabel(year, month)} · ${fmtGBP(collected)} collected of ${fmtGBP(totalDue)}`

  const thStyle: React.CSSProperties = {
    padding: '0 12px 10px',
    fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-mute)', whiteSpace: 'nowrap',
  }
  const tdBase: React.CSSProperties = {
    padding: '11px 12px', fontSize: 12, borderBottom: '1px solid var(--border)',
  }

  return (
    <>
      <AppShell title="Rent Ledger" subtitle={subtitle} action={{ label: 'Record Payment', onClick: () => setShowModal(true) }}>
        <PageWrapper>
          <motion.div variants={pageVariants} initial="hidden" animate="visible">

          {/* ── Bar chart (desktop only) ─────────────────────────────── */}
          <div className="hidden md:block">
          {monthSummaries.length > 0 && (
            <RentChart
              summaries={monthSummaries}
              selectedYear={year}
              selectedMonth={month}
              onSelect={(y, m, offset) => setMonthOffset(offset)}
            />
          )}
          </div>

          {/* ── Month navigation + KPI cards ─────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            {/* Prev */}
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <IconChevronLeft size={14} strokeWidth={2} />
            </button>

            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 120, textAlign: 'center' }}>
              {monthLabel(year, month)}
            </span>

            {/* Next */}
            <button
              onClick={() => setMonthOffset(o => o + 1)}
              disabled={monthOffset >= 0}
              style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface)', border: '1px solid var(--border)',
                color: 'var(--text-dim)', cursor: monthOffset >= 0 ? 'not-allowed' : 'pointer',
                opacity: monthOffset >= 0 ? 0.3 : 1, transition: 'color .15s, opacity .15s',
              }}
              onMouseEnter={e => { if (monthOffset < 0) e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <IconChevronRight size={14} strokeWidth={2} />
            </button>

            {/* KPI cards inline */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginLeft: 8 }}>
              <KpiCard
                label="Total Due"
                value={fmtGBP(totalDue)}
                sub={`${charges.length} charge${charges.length !== 1 ? 's' : ''}`}
              />
              <KpiCard
                label="Collected"
                value={fmtGBP(collected)}
                sub={totalDue > 0 ? `${Math.round((collected / totalDue) * 100)}% of total` : undefined}
                color="var(--mint)"
              />
              <KpiCard
                label="Outstanding"
                value={fmtGBP(outstanding)}
                sub={overdueCount > 0 ? `${overdueCount} overdue` : 'No overdue charges'}
                color={outstanding > 0 ? 'var(--rose)' : 'var(--text)'}
              />
            </div>
          </div>

          {/* ── Charges header row ───────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
              Charges · {monthLabel(year, month)}
            </p>
            {activeTenancies.length > 0 && (
              <button
                onClick={() => setShowAddCharge(true)}
                style={{
                  padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s, border-color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                + Add charge
              </button>
            )}
          </div>

          {/* ── Charges table / cards ────────────────────────────────── */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading charges…</p>
            </div>
          ) : charges.length === 0 ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180,
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No charges</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>No charges recorded for {monthLabel(year, month)}.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block" style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                overflow: 'hidden', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Tenant</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Property</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Due</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Amount</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Paid</th>
                      <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
                      <th style={{ ...thStyle, textAlign: 'left' }}>Status</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={stagger} initial="hidden" animate="visible">
                    {charges.map((c, i) => {
                      const balance = c.amount - c.paid_amount
                      return (
                        <motion.tr
                          key={c.id}
                          variants={rowAnim}
                          className="crystal-table-row"
                          style={{ borderBottom: i < charges.length - 1 ? '1px solid var(--border)' : 'none' }}
                        >
                          <td style={{ ...tdBase, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                            {leadTenantName(c)}
                          </td>
                          <td style={{ ...tdBase, color: 'var(--text-dim)' }}>
                            {propertyUnit(c)}
                          </td>
                          <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                            {fmtDate(c.due_date)}
                          </td>
                          <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', color: 'var(--text)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {fmtGBP(c.amount)}
                          </td>
                          <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', color: 'var(--mint)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {c.paid_amount > 0 ? fmtGBP(c.paid_amount) : <span style={{ color: 'var(--text-mute)' }}>—</span>}
                          </td>
                          <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', color: balance > 0 ? 'var(--rose)' : 'var(--text-mute)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {balance > 0 ? fmtGBP(balance) : '—'}
                          </td>
                          <td style={{ ...tdBase }}>
                            <StatusBadge status={c.status} />
                          </td>
                        </motion.tr>
                      )
                    })}
                  </motion.tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <motion.div className="flex md:hidden" variants={stagger} initial="hidden" animate="visible"
                style={{ flexDirection: 'column', gap: 10 }}>
                {charges.map(c => {
                  const balance = c.amount - c.paid_amount
                  return (
                    <motion.div key={c.id} variants={rowAnim}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{leadTenantName(c)}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{propertyUnit(c)}</p>
                        </div>
                        <StatusBadge status={c.status} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                        <div>
                          <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3 }}>Due {fmtDate(c.due_date)}</p>
                          <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmtGBP(c.amount)}</p>
                        </div>
                        {balance > 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3 }}>Outstanding</p>
                            <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--rose)' }}>{fmtGBP(balance)}</p>
                          </div>
                        )}
                        {c.paid_amount > 0 && balance <= 0 && (
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: 10, color: 'var(--text-mute)', marginBottom: 3 }}>Paid</p>
                            <p style={{ fontSize: 16, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--mint)' }}>{fmtGBP(c.paid_amount)}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>
            </>
          )}

          </motion.div>
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && activeTenancies.length > 0 && (
          <RecordPaymentModal
            orgId={orgId}
            tenancies={activeTenancies}
            onClose={() => setShowModal(false)}
            onRecorded={() => { setShowModal(false); refreshCharges() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddCharge && orgId && activeTenancies.length > 0 && (
          <AddChargeModal
            orgId={orgId}
            tenancies={activeTenancies}
            onClose={() => setShowAddCharge(false)}
            onAdded={() => { setShowAddCharge(false); refreshCharges() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
