'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconPencil } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type TenantRow } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

// ─── Constants ────────────────────────────────────────────────────────────────

const RTR_OPTIONS = [
  { value: 'not_checked',  label: 'Not yet checked' },
  { value: 'unlimited',    label: 'Passed — UK / Settled status' },
  { value: 'time_limited', label: 'Time-limited right to rent' },
  { value: 'failed',       label: 'Failed check' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const end   = new Date(dateStr); end.setHours(0, 0, 0, 0)
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

const pageVariants = { hidden: { opacity: 0, y: 4 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' as const } } }
const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const rowAnim = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function RightToRentBadge({ tenant }: { tenant: TenantRow }) {
  const status = tenant.right_to_rent_status
  if (!status || status === 'not_applicable') return <span className="crystal-pill void" style={{ fontSize: 10.5 }}>N/A</span>
  if (status === 'not_checked') return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>Not Checked</span>
  if (status === 'failed')      return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>Failed</span>
  if (status === 'time_limited') {
    if (tenant.right_to_rent_expiry) {
      const days = daysUntil(tenant.right_to_rent_expiry)
      if (days < 0)   return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>Expired</span>
      if (days <= 90) return <span className="crystal-pill warn" style={{ fontSize: 10.5 }}>Expiring ({days}d)</span>
    }
    return <span className="crystal-pill warn" style={{ fontSize: 10.5 }}>Time Limited</span>
  }
  return <span className="crystal-pill healthy" style={{ fontSize: 10.5 }}>UK / Settled</span>
}

function Avatar({ first, last }: { first: string; last: string }) {
  return (
    <div style={{ width: 30, height: 30, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--indigo), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px var(--glow-i)' }}>
      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#fff' }}>{initials(first, last)}</span>
    </div>
  )
}

// ─── Add Tenant Modal ─────────────────────────────────────────────────────────

function AddTenantModal({ orgId, onClose, onAdded }: {
  orgId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    first_name:            '',
    last_name:             '',
    email:                 '',
    phone:                 '',
    right_to_rent_status:  'not_checked',
    right_to_rent_expiry:  '',
  })
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    const { error: err } = await createClient().from('tenants').insert({
      org_id:               orgId,
      first_name:           form.first_name.trim(),
      last_name:            form.last_name.trim(),
      email:                form.email.trim() || null,
      phone:                form.phone.trim() || null,
      right_to_rent_status: form.right_to_rent_status,
      right_to_rent_expiry: form.right_to_rent_expiry || null,
      is_active:            true,
    })

    if (err) { setError(err.message); setSaving(false); return }
    onAdded()
  }

  const showExpiry = form.right_to_rent_status === 'time_limited'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div className="crystal-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Add tenant</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}>
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="First name" required>
              <input required className="crystal-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Jane" />
            </Field>
            <Field label="Last name" required>
              <input required className="crystal-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Smith" />
            </Field>
          </div>

          {/* Contact */}
          <Field label="Email address">
            <input type="email" className="crystal-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
          </Field>

          <Field label="Phone number">
            <input type="tel" className="crystal-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 900000" />
          </Field>

          {/* Right to Rent */}
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            Right to Rent (UK)
          </p>

          <Field label="Check status" required>
            <CrystalSelect value={form.right_to_rent_status} onChange={v => set('right_to_rent_status', v)} options={RTR_OPTIONS} />
          </Field>

          <AnimatePresence>
            {showExpiry && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                <Field label="Expiry date" hint="Required for time-limited status">
                  <CrystalDatePicker value={form.right_to_rent_expiry} onChange={v => set('right_to_rent_expiry', v)} />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

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
              {saving ? 'Adding…' : 'Add tenant'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

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

// ─── Edit Button ──────────────────────────────────────────────────────────────

function EditButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false)
  return (
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
          flexDirection: 'row-reverse',
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

// ─── Edit Tenant Modal ────────────────────────────────────────────────────────

const ACTIVE_OPTIONS = [
  { value: 'true',  label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

function EditTenantModal({ tenant, onClose, onSaved }: {
  tenant: TenantRow
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    first_name:           tenant.first_name,
    last_name:            tenant.last_name,
    email:                tenant.email ?? '',
    phone:                tenant.phone ?? '',
    right_to_rent_status: tenant.right_to_rent_status ?? 'not_checked',
    right_to_rent_expiry: tenant.right_to_rent_expiry ?? '',
    is_active:            String(tenant.is_active),
  })
  const [error, setSaveError] = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }

  const showExpiry = form.right_to_rent_status === 'time_limited'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setSaveError(null)
    const { error: err } = await createClient().from('tenants').update({
      first_name:           form.first_name.trim(),
      last_name:            form.last_name.trim(),
      email:                form.email.trim() || null,
      phone:                form.phone.trim() || null,
      right_to_rent_status: form.right_to_rent_status,
      right_to_rent_expiry: form.right_to_rent_expiry || null,
      is_active:            form.is_active === 'true',
    }).eq('id', tenant.id)
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
        style={{ position: 'relative', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Edit tenant</h2>
            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>
              {tenant.first_name} {tenant.last_name}
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
          {/* Name */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="First name" required>
              <input required className="crystal-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <input required className="crystal-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </Field>
          </div>

          {/* Contact */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Email address">
              <input type="email" className="crystal-input" value={form.email} onChange={e => set('email', e.target.value)} placeholder="jane@example.com" />
            </Field>
            <Field label="Phone number">
              <input type="tel" className="crystal-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+44 7700 900000" />
            </Field>
          </div>

          {/* Right to Rent */}
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            Right to Rent (UK)
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <Field label="Check status">
              <CrystalSelect value={form.right_to_rent_status} onChange={v => set('right_to_rent_status', v)} options={RTR_OPTIONS} />
            </Field>
            <AnimatePresence>
              {showExpiry && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Field label="Expiry date">
                    <CrystalDatePicker value={form.right_to_rent_expiry} onChange={v => set('right_to_rent_expiry', v)} />
                  </Field>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status */}
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            Tenant status
          </p>

          <Field label="Active / Inactive">
            <CrystalSelect value={form.is_active} onChange={v => set('is_active', v)} options={ACTIVE_OPTIONS} />
          </Field>

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

export default function TenantsPage() {
  const { orgId, tenants, loading, refreshTenants } = useOrgData()
  const [showModal,   setShowModal]   = useState(false)
  const [editTarget,  setEditTarget]  = useState<TenantRow | null>(null)

  const activeCount = tenants.filter(t => t.is_active).length
  const subtitle    = loading
    ? 'Loading…'
    : `${tenants.length} tenant${tenants.length !== 1 ? 's' : ''} · ${activeCount} active`

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
      <AppShell title="Tenants" subtitle={subtitle} action={{ label: 'Add Tenant', onClick: () => setShowModal(true) }}>
        <PageWrapper>
          <motion.div variants={pageVariants} initial="hidden" animate="visible">

            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading tenants…</p>
              </div>
            ) : tenants.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No tenants yet</p>
                  <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>Add your first tenant using the button above.</p>
                </div>
              </div>
            ) : (
              <>
                {/* ── Desktop table ────────────────────────────────────────── */}
                <div className="hidden md:block" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={thStyle}>Name</th>
                        <th style={thStyle}>Email</th>
                        <th style={{ ...thStyle, width: 1, paddingRight: 128 }}>Phone</th>
                        <th style={thStyle}>Current tenancy</th>
                        <th style={{ ...thStyle, width: 1, paddingRight: 128 }}>Right to Rent</th>
                        <th style={{ ...thStyle, width: 1, paddingRight: 128, backgroundImage: 'none' }}>Status</th>
                        <th style={{ ...thStyle, width: 1, backgroundImage: 'none' }} />
                      </tr>
                    </thead>
                    <motion.tbody variants={stagger} initial="hidden" animate="visible">
                      {tenants.map((tenant, i) => {
                        const tenancy = currentTenancy(tenant)
                        return (
                          <motion.tr key={tenant.id} variants={rowAnim} className="crystal-table-row"
                            style={{ borderBottom: i < tenants.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <td style={tdBase}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar first={tenant.first_name} last={tenant.last_name} />
                                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                                  {tenant.first_name} {tenant.last_name}
                                </span>
                              </div>
                            </td>
                            <td style={{ ...tdBase, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>{tenant.email ?? '—'}</td>
                            <td style={{ ...tdBase, color: 'var(--text-dim)', whiteSpace: 'nowrap', paddingRight: 128 }}>{tenant.phone ?? '—'}</td>
                            <td style={tdBase}>
                              {tenancy ? (
                                <>
                                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>{tenancy.properties?.name ?? '—'}</p>
                                  <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>{tenancy.unit_ref}</p>
                                </>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>No active tenancy</span>
                              )}
                            </td>
                            <td style={{ ...tdBase, paddingRight: 128 }}><RightToRentBadge tenant={tenant} /></td>
                            <td style={{ ...tdBase, paddingRight: 128, backgroundImage: 'none' }}>
                              {tenant.is_active
                                ? <span className="crystal-pill healthy dot" style={{ fontSize: 10.5 }}>Active</span>
                                : <span className="crystal-pill void" style={{ fontSize: 10.5 }}>Inactive</span>}
                            </td>
                            <td style={{ ...tdBase, padding: '0 8px 0 4px', backgroundImage: 'none' }}>
                              <EditButton onClick={e => { e.stopPropagation(); setEditTarget(tenant) }} />
                            </td>
                          </motion.tr>
                        )
                      })}
                    </motion.tbody>
                  </table>
                </div>

                {/* ── Mobile cards ──────────────────────────────────────────── */}
                <motion.div className="flex md:hidden" variants={stagger} initial="hidden" animate="visible"
                  style={{ flexDirection: 'column', gap: 10 }}>
                  {tenants.map(tenant => {
                    const tenancy = currentTenancy(tenant)
                    return (
                      <motion.div key={tenant.id} variants={rowAnim}
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Avatar first={tenant.first_name} last={tenant.last_name} />
                            <div>
                              <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 1 }}>
                                {tenant.first_name} {tenant.last_name}
                              </p>
                              {tenant.email && <p style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{tenant.email}</p>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                            <RightToRentBadge tenant={tenant} />
                            {tenant.is_active
                              ? <span className="crystal-pill healthy dot" style={{ fontSize: 10 }}>Active</span>
                              : <span className="crystal-pill void" style={{ fontSize: 10 }}>Inactive</span>}
                          </div>
                        </div>
                        <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {tenancy ? (
                            <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: 0 }}>
                              {tenancy.properties?.name ?? '—'} · {tenancy.unit_ref}
                            </p>
                          ) : (
                            <p style={{ fontSize: 11.5, color: 'var(--text-mute)', margin: 0 }}>No active tenancy</p>
                          )}
                          <button
                            onClick={() => setEditTarget(tenant)}
                            style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-mute)', fontSize: 11.5, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                            <IconPencil size={11} strokeWidth={1.75} />
                            Edit
                          </button>
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
        {showModal && orgId && (
          <AddTenantModal
            orgId={orgId}
            onClose={() => setShowModal(false)}
            onAdded={() => { setShowModal(false); refreshTenants() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editTarget && (
          <EditTenantModal
            tenant={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); refreshTenants() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
