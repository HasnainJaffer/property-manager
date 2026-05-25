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
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(dateStr)
  end.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function certTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    gas_safety:  'Gas Safety Certificate',
    eicr:        'EICR',
    epc:         'EPC',
    fire_risk:   'Fire Risk Assessment',
    legionella:  'Legionella Risk Assessment',
    pat_testing: 'PAT Testing',
    asbestos:    'Asbestos Survey',
    other:       'Other',
  }
  return labels[type] ?? type
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

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'expired' ? 'bg-red-500' :
    status === 'expiring_soon' ? 'bg-amber-500' :
    'bg-emerald-500'
  return <span className={`inline-block w-[7px] h-[7px] rounded-full ${color} mr-1.5 flex-shrink-0`} />
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'expired') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      <StatusDot status={status} />Expired
    </span>
  )
  if (status === 'expiring_soon') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
      <StatusDot status={status} />Expiring Soon
    </span>
  )
  if (status === 'no_expiry') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">No Expiry</span>
  )
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
      <StatusDot status={status} />Valid
    </span>
  )
}

function DaysRemainingBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null
  const days = daysUntil(expiryDate)
  if (days < 0) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">{Math.abs(days)}d overdue</span>
  }
  if (days <= 30) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">{days}d left</span>
  }
  if (days <= 90) {
    return <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">{days}d left</span>
  }
  return null
}

function ExpiryDateCell({ cert }: { cert: CertRow }) {
  if (!cert.expiry_date) {
    return <span className="text-[11px] text-gray-400 dark:text-gray-500">—</span>
  }
  const days = daysUntil(cert.expiry_date)
  const urgent = days < 0 || days <= 30
  const warning = days > 0 && days <= 90
  const cls = urgent
    ? 'text-red-600 dark:text-red-400'
    : warning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-gray-700 dark:text-gray-300'
  return <span className={`font-mono text-[11px] ${cls}`}>{fmtDate(cert.expiry_date)}</span>
}

// ─── Add Certificate Modal ────────────────────────────────────────────────────

function AddCertModal({
  orgId,
  properties,
  onClose,
  onAdded,
}: {
  orgId: string
  properties: PropertyOption[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    property_id: properties[0]?.id ?? '',
    certificate_type: 'gas_safety',
    reference_number: '',
    issued_by: '',
    issued_date: '',
    expiry_date: '',
    notes: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await createClient()
      .from('certificates')
      .insert({
        org_id: orgId,
        property_id: form.property_id,
        certificate_type: form.certificate_type,
        reference_number: form.reference_number.trim() || null,
        issued_by: form.issued_by.trim() || null,
        issued_date: form.issued_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes.trim() || null,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    onAdded()
  }

  const inputClass =
    'w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[13px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors'
  const labelClass = 'block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1.5'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Add certificate</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className={labelClass}>Certificate type <span className="text-red-500">*</span></label>
            <select required value={form.certificate_type} onChange={e => set('certificate_type', e.target.value)} className={inputClass}>
              <option value="gas_safety">Gas Safety Certificate</option>
              <option value="eicr">EICR (Electrical Installation Condition Report)</option>
              <option value="epc">EPC (Energy Performance Certificate)</option>
              <option value="fire_risk">Fire Risk Assessment</option>
              <option value="legionella">Legionella Risk Assessment</option>
              <option value="pat_testing">PAT Testing</option>
              <option value="asbestos">Asbestos Survey</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Property <span className="text-red-500">*</span></label>
            <select required value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputClass}>
              {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Issued date <span className="text-red-500">*</span></label>
              <input required type="date" value={form.issued_date} onChange={e => set('issued_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Expiry date</label>
              <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Reference number</label>
              <input value={form.reference_number} onChange={e => set('reference_number', e.target.value)} placeholder="e.g. GSC-2025-001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Issued by</label>
              <input value={form.issued_by} onChange={e => set('issued_by', e.target.value)} placeholder="e.g. British Gas" className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
          </div>

          {error && (
            <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded px-3 py-2">{error}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
              {loading ? 'Adding…' : 'Add certificate'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [orgId, setOrgId] = useState<string | null>(null)
  const [certs, setCerts] = useState<CertRow[]>([])
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [loading, setLoading] = useState(true)
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
  const urgentCount   = expiredCount + expiringCount
  const showBanner    = urgentCount > 0

  const subtitle = loading
    ? 'Loading…'
    : `${certs.length} certificate${certs.length !== 1 ? 's' : ''} · ${expiredCount} expired · ${expiringCount} expiring soon`

  return (
    <>
      <AppShell
        title="Compliance"
        subtitle={subtitle}
        action={{ label: 'Add Certificate', onClick: () => setShowModal(true) }}
      >
        <PageWrapper>
          <div className="p-6 space-y-4">
            {/* Alert banner */}
            <AnimatePresence>
              {showBanner && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-lg p-3 flex items-center gap-3 text-[11px] overflow-hidden"
                >
                  <IconAlertTriangle size={16} strokeWidth={2} className="flex-shrink-0" />
                  <span className="flex-1">
                    {expiredCount > 0 && <strong>{expiredCount} certificate{expiredCount !== 1 ? 's' : ''} expired</strong>}
                    {expiredCount > 0 && expiringCount > 0 && ' · '}
                    {expiringCount > 0 && <>{expiringCount} expiring within 90 days</>}
                    {' — action required to remain legally compliant.'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Certificates table */}
            {loading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <p className="text-[12px] text-gray-400">Loading certificates…</p>
              </div>
            ) : certs.length === 0 ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">No certificates</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Add compliance certificates to track expiry dates and stay legally compliant.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Certificate</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Property</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Issued</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Expires</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Days Left</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                    {certs.map((cert, i) => (
                      <motion.tr
                        key={cert.id}
                        variants={rowVariants}
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                          i < certs.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100">
                            {certTypeLabel(cert.certificate_type)}
                          </p>
                          {cert.reference_number && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-mono">{cert.reference_number}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="text-[12px] text-gray-700 dark:text-gray-300">{cert.properties?.name ?? '—'}</p>
                          {cert.units?.unit_ref && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{cert.units.unit_ref}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(cert.issued_date)}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <ExpiryDateCell cert={cert} />
                        </td>
                        <td className="py-2.5 px-4">
                          <DaysRemainingBadge expiryDate={cert.expiry_date} />
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={cert.status} />
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
