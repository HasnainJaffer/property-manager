'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconBuilding } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type PropertyRow, type PropertyType } from '@/lib/org-data-context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Animations ───────────────────────────────────────────────────────────────

const grid = { visible: { transition: { staggerChildren: 0.07 } } }
const card = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PropertyRow }) {
  const units    = property.units
  const total    = units.length
  const occupied = units.filter(u => u.status === 'occupied').length
  const pct      = total > 0 ? Math.round((occupied / total) * 100) : 0
  const isVoid   = total === 0 || occupied === 0
  const isFull   = total > 0 && occupied === total

  const monthlyRent = units.reduce((s, u) => s + (u.target_rent ?? 0), 0)
  const netYield =
    property.current_valuation && monthlyRent > 0
      ? (((monthlyRent * 12 - (property.mortgage_monthly ?? 0) * 12) / property.current_valuation) * 100).toFixed(1)
      : null

  const fillColor = isFull
    ? 'linear-gradient(90deg, var(--mint), var(--cyan))'
    : isVoid
    ? 'transparent'
    : 'linear-gradient(90deg, var(--amber), rgba(251,191,36,0.6))'

  return (
    <motion.div
      variants={card}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        padding: 20,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
        transition: 'border-color .15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Name + address + badges */}
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {property.name}
          </p>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {property.property_types && (
              <span className="crystal-pill" style={{ fontSize: 10 }}>
                {property.property_types.label}
              </span>
            )}
            {isVoid ? (
              <span className="crystal-pill void" style={{ fontSize: 10 }}>Void</span>
            ) : isFull ? (
              <span className="crystal-pill healthy" style={{ fontSize: 10 }}>Full</span>
            ) : (
              <span className="crystal-pill warn" style={{ fontSize: 10 }}>Partial</span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {property.address_line1}, {property.city}, {property.postcode}
        </p>
      </div>

      {/* Occupancy bar */}
      {total > 0 && (
        <div>
          <div style={{
            height: 4, borderRadius: 4, overflow: 'hidden',
            background: 'var(--surface-2)',
          }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
              style={{ height: '100%', borderRadius: 4, background: fillColor }}
            />
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 5 }}>
            {occupied} of {total} unit{total !== 1 ? 's' : ''} occupied
          </p>
        </div>
      )}

      {/* Financials */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          {monthlyRent > 0 && (
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-mono)', lineHeight: 1.2 }}>
              £{monthlyRent.toLocaleString('en-GB')}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-dim)', fontFamily: 'inherit' }}>/mo</span>
            </p>
          )}
          {netYield && (
            <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
              {netYield}% net yield
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          {property.purchase_date && (
            <p style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>
              Bought {fmtDate(property.purchase_date)}
            </p>
          )}
          {property.current_valuation && (
            <p style={{ fontSize: 10.5, color: 'var(--text-mute)', marginTop: 2 }}>
              Val. £{(property.current_valuation / 1000).toFixed(0)}k
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Add Property Modal ───────────────────────────────────────────────────────

function AddPropertyModal({ orgId, propertyTypes, onClose, onAdded }: {
  orgId: string
  propertyTypes: PropertyType[]
  onClose: () => void
  onAdded: () => void
}) {
  const [form, setForm] = useState({
    name: '', property_type_id: '', address_line1: '',
    city: '', postcode: '', purchase_price: '', purchase_date: '', mortgage_monthly: '',
  })
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await createClient()
      .from('properties')
      .insert({
        org_id:            orgId,
        property_type_id:  form.property_type_id,
        name:              form.name.trim(),
        address_line1:     form.address_line1.trim(),
        city:              form.city.trim(),
        postcode:          form.postcode.trim().toUpperCase(),
        purchase_price:    form.purchase_price ? parseFloat(form.purchase_price) : null,
        purchase_date:     form.purchase_date || null,
        mortgage_monthly:  form.mortgage_monthly ? parseFloat(form.mortgage_monthly) : null,
      })

    if (error) { setError(error.message); setSaving(false); return }
    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        className="crystal-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        className="crystal-modal crystal-scroll"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Add property
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent',
              color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color .15s, background .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Property name */}
          <ModalField label="Property name" required>
            <input
              required
              className="crystal-input"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. 24 Thornton Road"
            />
          </ModalField>

          {/* Property type */}
          <ModalField label="Property type" required>
            <select
              required
              className="crystal-select"
              value={form.property_type_id}
              onChange={e => set('property_type_id', e.target.value)}
            >
              {propertyTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </ModalField>

          {/* Address */}
          <ModalField label="Street address" required>
            <input
              required
              className="crystal-input"
              value={form.address_line1}
              onChange={e => set('address_line1', e.target.value)}
              placeholder="e.g. 24 Thornton Road"
            />
          </ModalField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModalField label="City" required>
              <input
                required
                className="crystal-input"
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Manchester"
              />
            </ModalField>
            <ModalField label="Postcode" required>
              <input
                required
                className="crystal-input"
                style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
                value={form.postcode}
                onChange={e => set('postcode', e.target.value.toUpperCase())}
                placeholder="M1 1AA"
              />
            </ModalField>
          </div>

          {/* Section divider */}
          <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', paddingTop: 4 }}>
            Financial details — optional
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <ModalField label="Purchase price">
              <PrefixInput prefix="£">
                <input
                  type="number" min="0" step="1000"
                  className="crystal-input"
                  style={{ paddingLeft: 22 }}
                  value={form.purchase_price}
                  onChange={e => set('purchase_price', e.target.value)}
                  placeholder="175000"
                />
              </PrefixInput>
            </ModalField>
            <ModalField label="Purchase date">
              <input
                type="date"
                className="crystal-input"
                value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)}
              />
            </ModalField>
            <ModalField label="Mortgage/mo">
              <PrefixInput prefix="£">
                <input
                  type="number" min="0" step="10"
                  className="crystal-input"
                  style={{ paddingLeft: 22 }}
                  value={form.mortgage_monthly}
                  onChange={e => set('mortgage_monthly', e.target.value)}
                  placeholder="620"
                />
              </PrefixInput>
            </ModalField>
          </div>

          {error && (
            <p style={{
              fontSize: 12, padding: '8px 12px', borderRadius: 8,
              background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)',
              color: 'var(--rose)',
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13,
                background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                color: 'var(--text-dim)', cursor: 'pointer',
                transition: 'color .15s, border-color .15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                boxShadow: '0 4px 14px var(--glow-i)',
                color: '#fff', border: 'none', cursor: 'pointer',
                opacity: saving ? 0.6 : 1,
                transition: 'opacity .15s',
              }}
            >
              {saving ? 'Adding…' : 'Add property'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// Small layout helpers for the modal form
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

function PrefixInput({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      <span style={{
        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
        fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none',
      }}>
        {prefix}
      </span>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { orgId, properties, propertyTypes, loading, refreshProperties } = useOrgData()
  const [showModal, setShowModal] = useState(false)

  const totalUnits = properties.reduce((s, p) => s + p.units.length, 0)
  const voidUnits  = properties.reduce((s, p) => s + p.units.filter(u => u.status === 'vacant').length, 0)
  const subtitle   = loading
    ? 'Loading…'
    : `${properties.length} propert${properties.length !== 1 ? 'ies' : 'y'} · ${totalUnits} unit${totalUnits !== 1 ? 's' : ''} · ${voidUnits} void`

  return (
    <>
      <AppShell
        title="Properties"
        subtitle={subtitle}
        action={{ label: 'Add Property', onClick: () => setShowModal(true) }}
      >
        <PageWrapper>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading properties…</p>
            </div>
          ) : (
            <motion.div
              variants={grid}
              initial="hidden"
              animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}
            >
              {properties.map(p => (
                <PropertyCard key={p.id} property={p} />
              ))}

              {/* Dashed add card */}
              <motion.button
                variants={card}
                onClick={() => setShowModal(true)}
                style={{
                  border: '1.5px dashed var(--border-2)',
                  borderRadius: 14,
                  minHeight: 180,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'transparent',
                  color: 'var(--text-mute)',
                  cursor: 'pointer',
                  transition: 'border-color .15s, color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.color = 'var(--indigo)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-mute)' }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'var(--surface-2)', border: '1px solid var(--border-2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconBuilding size={17} strokeWidth={1.6} />
                </div>
                <span style={{ fontSize: 12.5, fontWeight: 500 }}>Add property</span>
              </motion.button>
            </motion.div>
          )}
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <AddPropertyModal
            orgId={orgId}
            propertyTypes={propertyTypes}
            onClose={() => setShowModal(false)}
            onAdded={() => { setShowModal(false); refreshProperties() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
