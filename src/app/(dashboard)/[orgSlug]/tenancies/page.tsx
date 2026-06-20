'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconPlus, IconChevronDown, IconPencil } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type TenancyRow } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANCY_TYPES = [
  { value: 'ast',                  label: 'Assured Shorthold Tenancy (AST)' },
  { value: 'statutory_periodic',   label: 'Statutory Periodic' },
  { value: 'contractual_periodic', label: 'Contractual Periodic' },
  { value: 'licence',              label: 'Licence Agreement' },
  { value: 'other',                label: 'Other' },
]

const FREQUENCIES = [
  { value: 'monthly',     label: 'Monthly' },
  { value: 'weekly',      label: 'Weekly' },
  { value: 'fortnightly', label: 'Fortnightly' },
  { value: 'quarterly',   label: 'Quarterly' },
]

const DEPOSIT_SCHEMES = [
  { value: 'dps',       label: 'DPS — Deposit Protection Service' },
  { value: 'tds',       label: 'TDS — Tenancy Deposit Scheme' },
  { value: 'mydeposits',label: 'myDeposits' },
  { value: 'none',      label: 'None / Not yet registered' },
]

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active' },
  { value: 'periodic',  label: 'Periodic' },
  { value: 'in_notice', label: 'In Notice' },
  { value: 'ended',     label: 'Ended' },
  { value: 'cancelled', label: 'Cancelled' },
]

type FilterTab = 'all' | 'active' | 'expiring' | 'periodic' | 'ended'

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'expiring', label: 'Expiring' },
  { key: 'periodic', label: 'Periodic' },
  { key: 'ended',    label: 'Ended' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end   = new Date(dateStr); end.setHours(0, 0, 0, 0)
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

const pageVariants = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }
const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const rowAnim = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusBadge({ t }: { t: TenancyRow }) {
  if (t.status === 'active') {
    return isExpiring(t)
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
    ? <span className="crystal-pill healthy" style={{ fontSize: 10 }}>Deposit Protected</span>
    : <span className="crystal-pill arrears" style={{ fontSize: 10 }}>Unprotected</span>
}

function EndDateCell({ t }: { t: TenancyRow }) {
  if (!t.end_date) return <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>Rolling</span>
  const days  = daysUntil(t.end_date)
  const color = days < 30 ? 'var(--rose)' : days < 60 ? 'var(--amber)' : 'var(--text-dim)'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>
      {fmtDate(t.end_date)}
      {days >= 0 && days < 60 && (
        <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.8 }}>({days}d)</span>
      )}
    </span>
  )
}

// ─── Tenancy Detail Modal ─────────────────────────────────────────────────────

function TenancyDetailModal({ tenancy, onClose }: { tenancy: TenancyRow; onClose: () => void }) {
  const allTenants = tenancy.tenancy_tenants
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
      className="md:items-center md:p-4">
      <motion.div className="crystal-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="crystal-modal crystal-scroll md:rounded-2xl"
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
        transition={{ duration: 0.18 }}
        style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px 16px 0 0' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>{leadTenantName(tenancy)}</p>
            <p style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>
              {tenancy.units?.properties?.name} · {tenancy.units?.unit_ref}
            </p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}>
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status row */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <StatusBadge t={tenancy} />
            <DepositBadge t={tenancy} />
          </div>
          {/* Details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Type',       value: TENANCY_TYPES.find(t => t.value === tenancy.tenancy_type)?.label ?? tenancy.tenancy_type },
              { label: 'Rent',       value: `£${tenancy.rent_amount.toLocaleString('en-GB')}/${tenancy.rent_frequency === 'monthly' ? 'mo' : tenancy.rent_frequency}` },
              { label: 'Start',      value: fmtDate(tenancy.start_date) },
              { label: 'End',        value: tenancy.end_date ? fmtDate(tenancy.end_date) : 'Rolling' },
              { label: 'Deposit',    value: tenancy.deposit_amount ? `£${tenancy.deposit_amount.toLocaleString('en-GB')}` : 'None' },
              { label: 'Scheme',     value: tenancy.deposit_scheme ? tenancy.deposit_scheme.toUpperCase() : '—' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 3 }}>{label}</p>
                <p style={{ fontSize: 13, color: 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>
          {/* All tenants */}
          {allTenants.length > 0 && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', marginBottom: 8 }}>Tenants</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {allTenants.map((tt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg, var(--indigo), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 600, color: '#fff' }}>
                        {tt.tenants ? `${tt.tenants.first_name[0]}${tt.tenants.last_name[0]}`.toUpperCase() : '?'}
                      </span>
                    </div>
                    <span style={{ fontSize: 12.5, color: 'var(--text)' }}>
                      {tt.tenants ? `${tt.tenants.first_name} ${tt.tenants.last_name}` : '—'}
                    </span>
                    {tt.is_lead && <span className="crystal-pill" style={{ fontSize: 9.5, color: 'var(--indigo)' }}>Lead</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Add Tenancy Modal ────────────────────────────────────────────────────────

interface TenantChip { id: string; name: string }

function AddTenancyModal({ orgId, onClose, onAdded }: {
  orgId: string
  onClose: () => void
  onAdded: () => void
}) {
  const { properties, tenants } = useOrgData()

  const [form, setForm] = useState({
    unit_id:                   '',
    tenancy_type:              'ast',
    start_date:                new Date().toISOString().slice(0, 10),
    end_date:                  '',
    rent_amount:               '',
    rent_frequency:            'monthly',
    rent_due_day:              '1',
    deposit_amount:            '',
    deposit_scheme:            '',
    deposit_registered_date:   '',
  })
  const [selectedTenants, setSelectedTenants] = useState<TenantChip[]>([])
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // Build vacant unit options from cached properties
  const unitOptions = properties.flatMap(p =>
    p.units
      .filter(u => u.status === 'vacant')
      .map(u => ({
        value: u.id,
        label: `${p.name} — ${u.unit_ref}${u.target_rent ? ` (£${u.target_rent}/mo)` : ''}`,
        target_rent: u.target_rent,
      }))
  )

  // Available tenants = active tenants not yet in selectedTenants
  const selectedIds = new Set(selectedTenants.map(t => t.id))
  const tenantOptions = tenants
    .filter(t => t.is_active && !selectedIds.has(t.id))
    .map(t => ({ value: t.id, label: `${t.first_name} ${t.last_name}` }))

  function handleUnitChange(uid: string) {
    const opt = unitOptions.find(o => o.value === uid)
    set('unit_id', uid)
    if (opt?.target_rent && !form.rent_amount) {
      set('rent_amount', String(opt.target_rent))
    }
  }

  function addTenant(id: string) {
    const t = tenants.find(t => t.id === id)
    if (!t) return
    setSelectedTenants(prev => [...prev, { id: t.id, name: `${t.first_name} ${t.last_name}` }])
  }

  function removeTenant(id: string) {
    setSelectedTenants(prev => prev.filter(t => t.id !== id))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.unit_id)               { setError('Please select a unit.'); return }
    if (selectedTenants.length === 0) { setError('Please select at least one tenant.'); return }
    if (!form.rent_amount)           { setError('Please enter a rent amount.'); return }

    setSaving(true); setError(null)
    const supabase  = createClient()
    const tenancyId = crypto.randomUUID()

    const { error: tErr } = await supabase.from('tenancies').insert({
      id:                       tenancyId,
      org_id:                   orgId,
      unit_id:                  form.unit_id,
      tenancy_type:             form.tenancy_type,
      status:                   'active',
      start_date:               form.start_date,
      end_date:                 form.end_date || null,
      rent_amount:              parseFloat(form.rent_amount),
      rent_frequency:           form.rent_frequency,
      rent_due_day:             parseInt(form.rent_due_day, 10),
      deposit_amount:           form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      deposit_scheme:           form.deposit_scheme || null,
      deposit_registered_date:  form.deposit_registered_date || null,
    })
    if (tErr) { setError(tErr.message); setSaving(false); return }

    const { error: ttErr } = await supabase.from('tenancy_tenants').insert(
      selectedTenants.map((t, i) => ({ tenancy_id: tenancyId, tenant_id: t.id, is_lead: i === 0 }))
    )
    if (ttErr) { setError(ttErr.message); setSaving(false); return }

    // Mark unit as occupied
    await supabase.from('units').update({ status: 'occupied' }).eq('id', form.unit_id)

    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div className="crystal-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>New tenancy</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}>
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Unit */}
          <Field label="Property / Unit" required>
            <CrystalSelect
              value={form.unit_id}
              onChange={handleUnitChange}
              options={unitOptions}
              placeholder={unitOptions.length === 0 ? 'No vacant units available' : 'Select vacant unit…'}
            />
          </Field>

          {/* Tenancy type */}
          <Field label="Tenancy type" required>
            <CrystalSelect value={form.tenancy_type} onChange={v => set('tenancy_type', v)} options={TENANCY_TYPES} />
          </Field>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="Start date" required>
              <CrystalDatePicker value={form.start_date} onChange={v => set('start_date', v)} />
            </Field>
            <Field label="End date" hint="Leave blank for rolling">
              <CrystalDatePicker value={form.end_date} onChange={v => set('end_date', v)} />
            </Field>
          </div>

          {/* Divider */}
          <SectionLabel>Rent</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr', gap: 10 }}>
            <Field label="Amount" required>
              <PrefixInput prefix="£">
                <input required type="number" min="0.01" step="0.01" className="crystal-input" style={{ paddingLeft: 22 }}
                  value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} placeholder="950.00" />
              </PrefixInput>
            </Field>
            <Field label="Frequency">
              <CrystalSelect value={form.rent_frequency} onChange={v => set('rent_frequency', v)} options={FREQUENCIES} />
            </Field>
            <Field label="Due day">
              <input type="number" min="1" max="28" className="crystal-input"
                value={form.rent_due_day} onChange={e => set('rent_due_day', e.target.value)} />
            </Field>
          </div>

          {/* Divider */}
          <SectionLabel>Deposit — optional</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Deposit amount">
              <PrefixInput prefix="£">
                <input type="number" min="0" step="0.01" className="crystal-input" style={{ paddingLeft: 22 }}
                  value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} placeholder="0.00" />
              </PrefixInput>
            </Field>
            <Field label="Protection scheme">
              <CrystalSelect value={form.deposit_scheme} onChange={v => set('deposit_scheme', v)}
                options={DEPOSIT_SCHEMES} placeholder="Select…" />
            </Field>
            <Field label="Registered date">
              <CrystalDatePicker value={form.deposit_registered_date} onChange={v => set('deposit_registered_date', v)} />
            </Field>
          </div>

          {/* Divider */}
          <SectionLabel>Tenants</SectionLabel>

          {/* Chips */}
          {selectedTenants.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {selectedTenants.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 4px 10px', borderRadius: 20, background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
                  {i === 0 && <span style={{ fontSize: 9.5, color: 'var(--indigo)', fontWeight: 600, letterSpacing: '0.06em' }}>LEAD</span>}
                  <span style={{ fontSize: 12, color: 'var(--text)' }}>{t.name}</span>
                  <button type="button" onClick={() => removeTenant(t.id)} style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <IconX size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tenantOptions.length > 0 ? (
            <CrystalSelect
              value=""
              onChange={addTenant}
              options={tenantOptions}
              placeholder={selectedTenants.length === 0 ? 'Select lead tenant…' : 'Add another tenant…'}
            />
          ) : selectedTenants.length === 0 ? (
            <p style={{ fontSize: 11.5, color: 'var(--text-mute)', padding: '8px 0' }}>
              No active tenants found. Add tenants first from the Tenants page.
            </p>
          ) : null}

          {error && (
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s' }}>
              {saving ? 'Creating…' : 'Create tenancy'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Small layout helpers ─────────────────────────────────────────────────────

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-dim)', display: 'flex', gap: 6, alignItems: 'center' }}>
        {label}
        {required && <span style={{ color: 'var(--rose)' }}>*</span>}
        {hint && <span style={{ fontSize: 10.5, color: 'var(--text-mute)', fontWeight: 400 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', paddingTop: 10, borderTop: '1px solid var(--border)', paddingBottom: 0 }}>
      {children}
    </p>
  )
}

function PrefixInput({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none' }}>{prefix}</span>
      {children}
    </div>
  )
}

// ─── Edit Button ─────────────────────────────────────────────────────────────

function EditButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    // Fixed-width wrapper — table column sizes against this, never changes
    <div style={{ width: 68, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          height: 28,
          padding: '0 8px',
          borderRadius: 7,
          border: 'none',
          background: hovered ? 'rgba(129,140,248,0.1)' : 'transparent',
          color: hovered ? 'var(--indigo)' : 'var(--text-mute)',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          flexDirection: 'row-reverse', // icon on right, text grows leftward
          gap: 5,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <IconPencil size={13} strokeWidth={1.75} style={{ flexShrink: 0 }} />
        <span style={{
          fontSize: 12,
          fontWeight: 500,
          maxWidth: hovered ? 30 : 0,
          opacity: hovered ? 1 : 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          transition: 'max-width 0.2s ease, opacity 0.15s ease',
        }}>
          Edit
        </span>
      </button>
    </div>
  )
}

// ─── Edit Tenancy Modal ───────────────────────────────────────────────────────

function EditTenancyModal({ tenancy, onClose, onSaved }: {
  tenancy: TenancyRow
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    tenancy_type:            tenancy.tenancy_type,
    status:                  tenancy.status,
    start_date:              tenancy.start_date,
    end_date:                tenancy.end_date ?? '',
    rent_amount:             tenancy.rent_amount.toString(),
    rent_frequency:          tenancy.rent_frequency,
    deposit_amount:          tenancy.deposit_amount?.toString() ?? '',
    deposit_scheme:          tenancy.deposit_scheme ?? '',
    deposit_registered_date: tenancy.deposit_registered_date ?? '',
  })
  const [error, setSaveError] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveError(null)
    const { error: err } = await createClient().from('tenancies').update({
      tenancy_type:            form.tenancy_type,
      status:                  form.status,
      start_date:              form.start_date,
      end_date:                form.end_date || null,
      rent_amount:             parseFloat(form.rent_amount),
      rent_frequency:          form.rent_frequency,
      deposit_amount:          form.deposit_amount ? parseFloat(form.deposit_amount) : null,
      deposit_scheme:          form.deposit_scheme || null,
      deposit_registered_date: form.deposit_registered_date || null,
    }).eq('id', tenancy.id)
    if (err) { setSaveError(err.message); setSaving(false); return }
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div className="crystal-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Edit tenancy</h2>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>
              {leadTenantName(tenancy)} · {tenancy.units?.properties?.name}{tenancy.units?.unit_ref ? ` — ${tenancy.units.unit_ref}` : ''}
            </p>
          </div>
          <button onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}>
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Tenancy type" required>
              <CrystalSelect value={form.tenancy_type} onChange={v => set('tenancy_type', v)} options={TENANCY_TYPES} />
            </Field>
            <Field label="Status" required>
              <CrystalSelect value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
            </Field>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Start date" required>
              <CrystalDatePicker value={form.start_date} onChange={v => set('start_date', v)} />
            </Field>
            <Field label="End date" hint="Leave blank for rolling">
              <CrystalDatePicker value={form.end_date} onChange={v => set('end_date', v)} />
            </Field>
          </div>

          <SectionLabel>Rent</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Amount" required>
              <PrefixInput prefix="£">
                <input required type="number" min="0.01" step="0.01" className="crystal-input" style={{ paddingLeft: 22 }}
                  value={form.rent_amount} onChange={e => set('rent_amount', e.target.value)} />
              </PrefixInput>
            </Field>
            <Field label="Frequency">
              <CrystalSelect value={form.rent_frequency} onChange={v => set('rent_frequency', v)} options={FREQUENCIES} />
            </Field>
          </div>

          <SectionLabel>Deposit — optional</SectionLabel>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Deposit amount">
              <PrefixInput prefix="£">
                <input type="number" min="0" step="0.01" className="crystal-input" style={{ paddingLeft: 22 }}
                  value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)} />
              </PrefixInput>
            </Field>
            <Field label="Protection scheme">
              <CrystalSelect value={form.deposit_scheme} onChange={v => set('deposit_scheme', v)} options={DEPOSIT_SCHEMES} placeholder="Select…" />
            </Field>
            <Field label="Registered date">
              <CrystalDatePicker value={form.deposit_registered_date} onChange={v => set('deposit_registered_date', v)} />
            </Field>
          </div>

          {error && (
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              Cancel
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s' }}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenanciesPage() {
  const { tenancies, loading, refreshTenancies, refreshProperties, refreshTenants } = useOrgData()
  const { orgId } = useOrgData()
  const [tab, setTab]               = useState<FilterTab>('all')
  const [showModal, setShowModal]   = useState(false)
  const [detail, setDetail]         = useState<TenancyRow | null>(null)
  const [editTarget, setEditTarget] = useState<TenancyRow | null>(null)

  const activeCount   = tenancies.filter(t => ['active', 'periodic', 'in_notice'].includes(t.status)).length
  const expiringCount = tenancies.filter(t => isExpiring(t)).length
  const filtered      = applyFilter(tenancies, tab)

  const subtitle = loading
    ? 'Loading…'
    : `${activeCount} active · ${expiringCount} expiring within 60 days`

  async function handleAdded() {
    setShowModal(false)
    await Promise.all([refreshTenancies(), refreshProperties(), refreshTenants()])
  }

  const colDivider: React.CSSProperties = {
    backgroundImage: 'linear-gradient(to bottom, transparent 15%, rgba(255,255,255,0.08) 15%, rgba(255,255,255,0.08) 85%, transparent 85%)',
    backgroundSize: '1px 100%',
    backgroundPosition: 'right center',
    backgroundRepeat: 'no-repeat',
  }
  const thStyle: React.CSSProperties = { padding: '12px 12px 10px', fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', textAlign: 'left', whiteSpace: 'nowrap', ...colDivider }
  const tdBase: React.CSSProperties  = { padding: '11px 12px', fontSize: 12, borderBottom: '1px solid var(--border)', ...colDivider }

  return (
    <>
      <AppShell title="Tenancies" subtitle={subtitle} action={{ label: 'New Tenancy', onClick: () => setShowModal(true) }}>
        <PageWrapper>
          <motion.div variants={pageVariants} initial="hidden" animate="visible">

            {/* ── Filter tabs ─────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
              {TABS.map(t => {
                const active = tab === t.key
                return (
                  <button key={t.key} onClick={() => setTab(t.key)}
                    style={{ padding: '8px 12px', fontSize: 12.5, fontWeight: active ? 500 : 400, color: active ? 'var(--text)' : 'var(--text-dim)', background: 'transparent', border: 'none', borderBottom: `2px solid ${active ? 'var(--indigo)' : 'transparent'}`, marginBottom: -1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'color .15s' }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-dim)' }}>
                    {t.label}
                    {t.key === 'expiring' && !loading && expiringCount > 0 && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 18, height: 16, padding: '0 4px', borderRadius: 5, fontSize: 10, fontWeight: 500, background: 'rgba(251,191,36,.15)', color: 'var(--amber)' }}>
                        {expiringCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading tenancies…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No tenancies</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                    {tab === 'all' ? 'Create your first tenancy using the button above.' : 'No tenancies match this filter.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Desktop table ─────────────────────────────────────────── */}
                <div className="hidden md:block" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Tenant</th>
                        <th style={thStyle}>Property / Unit</th>
                        <th style={{ ...thStyle, width: 1 }}>Rent</th>
                        <th style={{ ...thStyle, width: 1 }}>Start</th>
                        <th style={{ ...thStyle, width: 1 }}>End</th>
                        <th style={{ ...thStyle, width: 1 }}>Status</th>
                        <th style={{ ...thStyle, width: 1, backgroundImage: 'none' }}>Deposit</th>
                        <th style={{ ...thStyle, width: 1, backgroundImage: 'none' }}></th>
                      </tr>
                    </thead>
                    <motion.tbody variants={stagger} initial="hidden" animate="visible">
                      {filtered.map((t, i) => (
                        <motion.tr key={t.id} variants={rowAnim} className="crystal-table-row"
                          style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                          onClick={() => setDetail(t)}>
                          <td style={{ ...tdBase, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>{leadTenantName(t)}</td>
                          <td style={{ ...tdBase, color: 'var(--text-dim)' }}>
                            <p style={{ margin: 0, color: 'var(--text)', fontSize: 12 }}>{t.units?.properties?.name ?? '—'}</p>
                            {t.units?.unit_ref && <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>{t.units.unit_ref}</p>}
                          </td>
                          <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontSize: 12 }}>£{t.rent_amount.toLocaleString('en-GB')}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-mute)', marginLeft: 2 }}>/mo</span>
                          </td>
                          <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{fmtDate(t.start_date)}</td>
                          <td style={{ ...tdBase, whiteSpace: 'nowrap' }}><EndDateCell t={t} /></td>
                          <td style={tdBase}><StatusBadge t={t} /></td>
                          <td style={{ ...tdBase, backgroundImage: 'none' }}><DepositBadge t={t} /></td>
                          <td style={{ ...tdBase, textAlign: 'right', whiteSpace: 'nowrap', backgroundImage: 'none' }}>
                            <EditButton onClick={e => { e.stopPropagation(); setEditTarget(t) }} />
                          </td>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </table>
                </div>

                {/* ── Mobile cards ──────────────────────────────────────────── */}
                <motion.div className="flex md:hidden" variants={stagger} initial="hidden" animate="visible"
                  style={{ flexDirection: 'column', gap: 10 }}>
                  {filtered.map(t => (
                    <motion.div key={t.id} variants={rowAnim} onClick={() => setDetail(t)}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14, cursor: 'pointer', transition: 'border-color .15s' }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{leadTenantName(t)}</p>
                          <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                            {t.units?.properties?.name ?? '—'}{t.units?.unit_ref ? ` · ${t.units.unit_ref}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <StatusBadge t={t} />
                          <DepositBadge t={t} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                          £{t.rent_amount.toLocaleString('en-GB')}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)' }}>/mo</span>
                        </span>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 10.5, color: 'var(--text-mute)', marginBottom: 1 }}>
                            From {fmtDate(t.start_date)}
                          </p>
                          {t.end_date && (
                            <p style={{ fontSize: 10.5, color: daysUntil(t.end_date) < 60 ? 'var(--amber)' : 'var(--text-mute)' }}>
                              To {fmtDate(t.end_date)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-mute)', fontSize: 11 }}>
                          <IconChevronDown size={12} strokeWidth={2} />
                          <span>Tap for details</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setEditTarget(t) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer' }}
                        >
                          <IconPencil size={11} strokeWidth={1.75} />
                          Edit
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          </motion.div>
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <AddTenancyModal
            orgId={orgId}
            onClose={() => setShowModal(false)}
            onAdded={handleAdded}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {detail && <TenancyDetailModal tenancy={detail} onClose={() => setDetail(null)} />}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <EditTenancyModal
            tenancy={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); refreshTenancies() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
