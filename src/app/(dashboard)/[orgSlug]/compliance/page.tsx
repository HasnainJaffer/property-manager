'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconAlertTriangle, IconX } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertRow {
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

interface PropertyOption {
  id: string
  name: string
}

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

function certTypeLabel(type: string): string {
  const map: Record<string, string> = {
    gas_safety:  'Gas Safety Certificate',
    eicr:        'EICR',
    epc:         'EPC',
    fire_risk:   'Fire Risk Assessment',
    legionella:  'Legionella Risk Assessment',
    pat_testing: 'PAT Testing',
    asbestos:    'Asbestos Survey',
    other:       'Other',
  }
  return map[type] ?? type
}

// ─── Animations ───────────────────────────────────────────────────────────────

const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const row     = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'expired'       ? 'var(--rose)'  :
    status === 'expiring_soon' ? 'var(--amber)' :
    'var(--mint)'
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'expired') {
    return (
      <span className="crystal-pill arrears" style={{ fontSize: 10.5, gap: 5 }}>
        <StatusDot status={status} /> Expired
      </span>
    )
  }
  if (status === 'expiring_soon') {
    return (
      <span className="crystal-pill warn" style={{ fontSize: 10.5, gap: 5 }}>
        <StatusDot status={status} /> Expiring Soon
      </span>
    )
  }
  if (status === 'no_expiry') {
    return <span className="crystal-pill void" style={{ fontSize: 10.5 }}>No Expiry</span>
  }
  return (
    <span className="crystal-pill healthy" style={{ fontSize: 10.5, gap: 5 }}>
      <StatusDot status={status} /> Valid
    </span>
  )
}

function DaysRemainingBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null
  const days = daysUntil(expiryDate)
  if (days < 0)   return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>{Math.abs(days)}d overdue</span>
  if (days <= 30) return <span className="crystal-pill arrears" style={{ fontSize: 10.5 }}>{days}d left</span>
  if (days <= 90) return <span className="crystal-pill warn"    style={{ fontSize: 10.5 }}>{days}d left</span>
  return null
}

function ExpiryDateCell({ cert }: { cert: CertRow }) {
  if (!cert.expiry_date) {
    return <span style={{ fontSize: 11, color: 'var(--text-mute)' }}>—</span>
  }
  const days   = daysUntil(cert.expiry_date)
  const urgent = days < 0 || days <= 30
  const warn   = days > 0 && days <= 90
  const color  = urgent ? 'var(--rose)' : warn ? 'var(--amber)' : 'var(--text-dim)'
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color }}>
      {fmtDate(cert.expiry_date)}
    </span>
  )
}

// ─── Add Certificate Modal ────────────────────────────────────────────────────

function AddCertModal({ orgId, properties, onClose, onAdded }: {
  orgId: string
  properties: PropertyOption[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    property_id:      properties[0]?.id ?? '',
    certificate_type: 'gas_safety',
    reference_number: '',
    issued_by:        '',
    issued_date:      '',
    expiry_date:      '',
    notes:            '',
  })
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(null)

    const { error } = await createClient()
      .from('certificates')
      .insert({
        org_id:           orgId,
        property_id:      form.property_id,
        certificate_type: form.certificate_type,
        reference_number: form.reference_number.trim() || null,
        issued_by:        form.issued_by.trim() || null,
        issued_date:      form.issued_date,
        expiry_date:      form.expiry_date || null,
        notes:            form.notes.trim() || null,
      })

    if (error) { setError(error.message); setSaving(false); return }
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
        style={{ position: 'relative', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Add certificate</h2>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MF label="Certificate type" required>
            <select required className="crystal-select" value={form.certificate_type} onChange={e => set('certificate_type', e.target.value)}>
              <option value="gas_safety">Gas Safety Certificate</option>
              <option value="eicr">EICR (Electrical Installation Condition Report)</option>
              <option value="epc">EPC (Energy Performance Certificate)</option>
              <option value="fire_risk">Fire Risk Assessment</option>
              <option value="legionella">Legionella Risk Assessment</option>
              <option value="pat_testing">PAT Testing</option>
              <option value="asbestos">Asbestos Survey</option>
              <option value="other">Other</option>
            </select>
          </MF>

          <MF label="Property" required>
            <select required className="crystal-select" value={form.property_id} onChange={e => set('property_id', e.target.value)}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </MF>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Issued date" required>
              <input required type="date" className="crystal-input" value={form.issued_date} onChange={e => set('issued_date', e.target.value)} />
            </MF>
            <MF label="Expiry date">
              <input type="date" className="crystal-input" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} />
            </MF>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Reference number">
              <input className="crystal-input" style={{ fontFamily: 'var(--font-mono)' }} value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="e.g. GSC-2025-001" />
            </MF>
            <MF label="Issued by">
              <input className="crystal-input" value={form.issued_by} onChange={e => set('issued_by', e.target.value)} placeholder="e.g. British Gas" />
            </MF>
          </div>

          <MF label="Notes">
            <textarea
              className="crystal-input"
              style={{ resize: 'none', minHeight: 64, lineHeight: 1.5 }}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
            />
          </MF>

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
              {saving ? 'Adding…' : 'Add certificate'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function MF({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

export default function CompliancePage() {
  const params  = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [orgId, setOrgId]         = useState<string | null>(null)
  const [certs, setCerts]         = useState<CertRow[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setShowModal] = useState(false)

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

    const [{ data: certData }, { data: propData }] = await Promise.all([
      supabase
        .from('certificates')
        .select(`
          id, certificate_type, issued_date, expiry_date, status,
          reference_number, notes,
          properties ( name ),
          units ( unit_ref )
        `)
        .eq('org_id', org.id)
        .eq('is_active', true)
        .order('expiry_date', { ascending: true, nullsFirst: false }),
      supabase
        .from('properties')
        .select('id, name')
        .eq('org_id', org.id)
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    setCerts((certData as unknown as CertRow[]) ?? [])
    setProperties((propData as unknown as PropertyOption[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  const expiredCount  = certs.filter(c => c.status === 'expired').length
  const expiringCount = certs.filter(c => c.status === 'expiring_soon').length
  const showBanner    = expiredCount + expiringCount > 0

  const subtitle = loading
    ? 'Loading…'
    : `${certs.length} certificate${certs.length !== 1 ? 's' : ''} · ${expiredCount} expired · ${expiringCount} expiring soon`

  const thStyle: React.CSSProperties = {
    padding: '0 12px 10px',
    fontSize: 10, fontWeight: 500, letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--text-mute)',
    textAlign: 'left', whiteSpace: 'nowrap',
  }
  const tdBase: React.CSSProperties = {
    padding: '11px 12px', fontSize: 12, borderBottom: '1px solid var(--border)',
  }

  return (
    <>
      <AppShell title="Compliance" subtitle={subtitle} action={{ label: 'Add Certificate', onClick: () => setShowModal(true) }}>
        <PageWrapper>

          {/* ── Alert banner ─────────────────────────────────────────────── */}
          <AnimatePresence>
            {!loading && showBanner && (
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
                  <span style={{ flex: 1, color: 'var(--text-dim)' }}>
                    {expiredCount > 0 && (
                      <strong style={{ color: 'var(--text)', fontWeight: 600 }}>
                        {expiredCount} certificate{expiredCount !== 1 ? 's' : ''} expired
                      </strong>
                    )}
                    {expiredCount > 0 && expiringCount > 0 && <span style={{ color: 'var(--text-mute)' }}> · </span>}
                    {expiringCount > 0 && <>{expiringCount} expiring within 90 days</>}
                    {' — action required to remain legally compliant.'}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Table ────────────────────────────────────────────────────── */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading certificates…</p>
            </div>
          ) : certs.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>No certificates</p>
                <p style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                  Add compliance certificates to track expiry dates and stay legally compliant.
                </p>
              </div>
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
              overflow: 'hidden', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle}>Certificate</th>
                    <th style={thStyle}>Property</th>
                    <th style={thStyle}>Issued</th>
                    <th style={thStyle}>Expires</th>
                    <th style={thStyle}>Days Left</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <motion.tbody variants={stagger} initial="hidden" animate="visible">
                  {certs.map((cert, i) => (
                    <motion.tr
                      key={cert.id}
                      variants={row}
                      className="crystal-table-row"
                      style={{ borderBottom: i < certs.length - 1 ? '1px solid var(--border)' : 'none' }}
                    >
                      <td style={{ ...tdBase }}>
                        <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                          {certTypeLabel(cert.certificate_type)}
                        </p>
                        {cert.reference_number && (
                          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)', fontFamily: 'var(--font-mono)' }}>
                            {cert.reference_number}
                          </p>
                        )}
                      </td>
                      <td style={{ ...tdBase }}>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>
                          {cert.properties?.name ?? '—'}
                        </p>
                        {cert.units?.unit_ref && (
                          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>
                            {cert.units.unit_ref}
                          </p>
                        )}
                      </td>
                      <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                        {fmtDate(cert.issued_date)}
                      </td>
                      <td style={{ ...tdBase, whiteSpace: 'nowrap' }}>
                        <ExpiryDateCell cert={cert} />
                      </td>
                      <td style={{ ...tdBase }}>
                        <DaysRemainingBadge expiryDate={cert.expiry_date} />
                      </td>
                      <td style={{ ...tdBase }}>
                        <StatusBadge status={cert.status} />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <AddCertModal
            orgId={orgId}
            properties={properties}
            onClose={() => setShowModal(false)}
            onAdded={() => { setShowModal(false); load() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
