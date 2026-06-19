'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconAlertTriangle, IconX, IconEye } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type CertRow } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

const CERT_TYPE_OPTIONS = [
  { value: 'gas_safety', label: 'Gas Safety Certificate' },
  { value: 'eicr',       label: 'EICR (Electrical Installation Condition Report)' },
  { value: 'epc',        label: 'EPC (Energy Performance Certificate)' },
  { value: 'fire_risk',  label: 'Fire Risk Assessment' },
  { value: 'legionella', label: 'Legionella Risk Assessment' },
  { value: 'pat_testing',label: 'PAT Testing' },
  { value: 'asbestos',   label: 'Asbestos Survey' },
  { value: 'other',      label: 'Other' },
]

interface PropertyOption { id: string; name: string }

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
            <CrystalSelect
              value={form.certificate_type}
              onChange={v => set('certificate_type', v)}
              options={CERT_TYPE_OPTIONS}
            />
          </MF>

          <MF label="Property" required>
            <CrystalSelect
              value={form.property_id}
              onChange={v => set('property_id', v)}
              options={properties.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Select property…"
            />
          </MF>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Issued date" required>
              <CrystalDatePicker
                value={form.issued_date}
                onChange={v => set('issued_date', v)}
              />
            </MF>
            <MF label="Expiry date">
              <CrystalDatePicker
                value={form.expiry_date}
                onChange={v => set('expiry_date', v)}
              />
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

// ─── Mobile cert detail modal ─────────────────────────────────────────────────

function CertDetailModal({ cert, onClose }: { cert: CertRow; onClose: () => void }) {
  const labelStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.1em', color: 'var(--text-mute)', marginBottom: 4,
  }
  const valueStyle: React.CSSProperties = {
    fontSize: 13, color: 'var(--text)', fontWeight: 500,
  }

  function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <p style={labelStyle}>{label}</p>
        <div style={valueStyle}>{children}</div>
      </div>
    )
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
        style={{ position: 'relative', width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            {certTypeLabel(cert.certificate_type)}
          </h2>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconX size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Status banner */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={cert.status} />
          {cert.expiry_date && <DaysRemainingBadge expiryDate={cert.expiry_date} />}
        </div>

        {/* Details grid */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          <DetailRow label="Property">
            <span>
              {cert.properties?.name ?? '—'}
              {cert.units?.unit_ref && (
                <span style={{ color: 'var(--text-mute)', fontWeight: 400 }}> · {cert.units.unit_ref}</span>
              )}
            </span>
          </DetailRow>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <DetailRow label="Issued date">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {fmtDate(cert.issued_date)}
              </span>
            </DetailRow>
            <DetailRow label="Expiry date">
              {cert.expiry_date
                ? <ExpiryDateCell cert={cert} />
                : <span style={{ color: 'var(--text-mute)', fontWeight: 400, fontSize: 13 }}>No expiry</span>
              }
            </DetailRow>
          </div>

          {cert.reference_number && (
            <DetailRow label="Reference number">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                {cert.reference_number}
              </span>
            </DetailRow>
          )}

          {cert.notes && (
            <DetailRow label="Notes">
              <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                {cert.notes}
              </span>
            </DetailRow>
          )}

        </div>
      </motion.div>
    </div>
  )
}

// ─── Mobile cert card ─────────────────────────────────────────────────────────

function MobileCertCard({ cert, onView }: { cert: CertRow; onView: () => void }) {
  return (
    <motion.div
      variants={row}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 14px',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset',
      }}
    >
      {/* Left: cert type + property */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {certTypeLabel(cert.certificate_type)}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {cert.properties?.name ?? '—'}
          {cert.units?.unit_ref && <span style={{ color: 'var(--text-mute)' }}> · {cert.units.unit_ref}</span>}
        </p>
      </div>

      {/* Right: status badge + eye button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <StatusBadge status={cert.status} />
        <button
          type="button"
          onClick={onView}
          aria-label="View certificate details"
          style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            color: 'var(--text-mute)', cursor: 'pointer',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--indigo)'; e.currentTarget.style.borderColor = 'var(--indigo)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
        >
          <IconEye size={14} strokeWidth={1.75} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const { orgId, certs, properties, loading, refreshCerts } = useOrgData()
  const [showModal,    setShowModal]    = useState(false)
  const [selectedCert, setSelectedCert] = useState<CertRow | null>(null)

  // Derive property options from cached properties
  const propertyOptions = properties.map(p => ({ id: p.id, name: p.name }))

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
            <>
              {/* ── Desktop: full table ──────────────────────────────────── */}
              <div className="hidden md:block" style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
                overflow: 'hidden',
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

              {/* ── Mobile: compact card list ────────────────────────────── */}
              <motion.div
                className="flex md:hidden flex-col"
                style={{ gap: 8 }}
                variants={stagger}
                initial="hidden"
                animate="visible"
              >
                {certs.map(cert => (
                  <MobileCertCard
                    key={cert.id}
                    cert={cert}
                    onView={() => setSelectedCert(cert)}
                  />
                ))}
              </motion.div>
            </>
          )}
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <AddCertModal
            orgId={orgId}
            properties={propertyOptions}
            onClose={() => setShowModal(false)}
            onAdded={() => { setShowModal(false); refreshCerts() }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedCert && (
          <CertDetailModal
            cert={selectedCert}
            onClose={() => setSelectedCert(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
