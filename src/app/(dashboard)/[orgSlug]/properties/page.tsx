'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconBuilding, IconChevronRight, IconPlus, IconPencil, IconTrash } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type PropertyRow, type PropertyType } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

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

function PropertyCard({ property, onViewClick }: {
  property: PropertyRow
  onViewClick: () => void
}) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
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
          <div style={{ height: 4, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-2)' }}>
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

      {/* Financials + Details button */}
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
        <button
          onClick={onViewClick}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 7, fontSize: 12,
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            color: 'var(--text-dim)', cursor: 'pointer',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--indigo)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
        >
          Details
          <IconChevronRight size={12} strokeWidth={2} />
        </button>
      </div>
    </motion.div>
  )
}

// ─── Shared modal helpers ─────────────────────────────────────────────────────

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
      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none' }}>
        {prefix}
      </span>
      {children}
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
      <p style={{ fontSize: 10, color: 'var(--text-mute)', margin: '0 0 3px' }}>{label}</p>
      <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-mono)', margin: 0 }}>{value}</p>
    </div>
  )
}

// ─── Property Detail Modal ────────────────────────────────────────────────────

function PropertyDetailModal({ property, isOwner, orgId, propertyTypes, onClose, onDeleted, onUnitAdded, onPropertyUpdated }: {
  property: PropertyRow
  isOwner: boolean
  orgId: string
  propertyTypes: PropertyType[]
  onClose: () => void
  onDeleted: () => void
  onUnitAdded: () => void
  onPropertyUpdated: () => void
}) {
  const [unitTypes, setUnitTypes]     = useState<{ value: string; label: string }[]>([])
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [unitForm, setUnitForm]       = useState({ unit_ref: '', unit_type_id: '', target_rent: '' })
  const [addError, setAddError]       = useState<string | null>(null)
  const [addSaving, setAddSaving]     = useState(false)
  const [editingUnitId, setEditingUnitId]   = useState<string | null>(null)
  const [editUnitForm, setEditUnitForm]     = useState({ unit_ref: '', unit_type_id: '', target_rent: '' })
  const [editUnitError, setEditUnitError]   = useState<string | null>(null)
  const [unitSaving, setUnitSaving]         = useState(false)
  const [removingUnitId, setRemovingUnitId] = useState<string | null>(null)
  const [removeUnitError, setRemoveUnitError] = useState<string | null>(null)
  const [unitRemoving, setUnitRemoving]     = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [editing, setEditing]         = useState(false)
  const [editForm, setEditForm]       = useState({
    name: property.name,
    property_type_id: property.property_type_id ?? '',
    address_line1: property.address_line1,
    city: property.city,
    postcode: property.postcode,
    purchase_price: property.purchase_price?.toString() ?? '',
    purchase_date: property.purchase_date ?? '',
    mortgage_monthly: property.mortgage_monthly?.toString() ?? '',
    current_valuation: property.current_valuation?.toString() ?? '',
  })
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState<string | null>(null)

  // Keep edit form in sync with refreshed property data (only when not actively editing)
  useEffect(() => {
    if (editing) return
    setEditForm({
      name: property.name,
      property_type_id: property.property_type_id ?? '',
      address_line1: property.address_line1,
      city: property.city,
      postcode: property.postcode,
      purchase_price: property.purchase_price?.toString() ?? '',
      purchase_date: property.purchase_date ?? '',
      mortgage_monthly: property.mortgage_monthly?.toString() ?? '',
      current_valuation: property.current_valuation?.toString() ?? '',
    })
  }, [property, editing])

  useEffect(() => {
    createClient()
      .from('unit_types')
      .select('id, label')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setUnitTypes(data.map(t => ({ value: t.id, label: t.label })))
      })
  }, [])

  function setEdit(k: keyof typeof editForm, v: string) {
    setEditForm(f => ({ ...f, [k]: v }))
  }

  function setUnit(k: keyof typeof unitForm, v: string) {
    setUnitForm(f => ({ ...f, [k]: v }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setEditSaving(true)
    setEditError(null)
    const { error } = await createClient().from('properties').update({
      name:             editForm.name.trim(),
      property_type_id: editForm.property_type_id || null,
      address_line1:    editForm.address_line1.trim(),
      city:             editForm.city.trim(),
      postcode:         editForm.postcode.trim().toUpperCase(),
      purchase_price:   editForm.purchase_price   ? parseFloat(editForm.purchase_price)   : null,
      purchase_date:    editForm.purchase_date    || null,
      mortgage_monthly: editForm.mortgage_monthly ? parseFloat(editForm.mortgage_monthly) : null,
      current_valuation: editForm.current_valuation ? parseFloat(editForm.current_valuation) : null,
    }).eq('id', property.id)
    if (error) { setEditError(error.message); setEditSaving(false); return }
    setEditing(false)
    setEditSaving(false)
    onPropertyUpdated()
  }

  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault()
    if (!unitForm.unit_ref.trim()) { setAddError('Unit ref is required.'); return }
    if (!unitForm.unit_type_id)    { setAddError('Please select a unit type.'); return }
    setAddSaving(true)
    setAddError(null)
    const { error } = await createClient().from('units').insert({
      org_id:       orgId,
      property_id:  property.id,
      unit_type_id: unitForm.unit_type_id,
      unit_ref:     unitForm.unit_ref.trim(),
      target_rent:  unitForm.target_rent ? parseFloat(unitForm.target_rent) : null,
      status:       'vacant',
    })
    if (error) { setAddError(error.message); setAddSaving(false); return }
    setUnitForm({ unit_ref: '', unit_type_id: '', target_rent: '' })
    setShowAddUnit(false)
    setAddSaving(false)
    onUnitAdded()
  }

  function startEditUnit(unit: { id: string; unit_ref: string; unit_type_id: string | null; target_rent: number | null }) {
    setEditingUnitId(unit.id)
    setEditUnitForm({
      unit_ref:     unit.unit_ref,
      unit_type_id: unit.unit_type_id ?? '',
      target_rent:  unit.target_rent?.toString() ?? '',
    })
    setEditUnitError(null)
    setRemovingUnitId(null)
  }

  async function handleSaveUnit(e: React.FormEvent) {
    e.preventDefault()
    if (!editUnitForm.unit_ref.trim()) { setEditUnitError('Unit ref is required.'); return }
    if (!editUnitForm.unit_type_id)    { setEditUnitError('Please select a unit type.'); return }
    setUnitSaving(true)
    setEditUnitError(null)
    const { error } = await createClient().from('units').update({
      unit_ref:     editUnitForm.unit_ref.trim(),
      unit_type_id: editUnitForm.unit_type_id,
      target_rent:  editUnitForm.target_rent ? parseFloat(editUnitForm.target_rent) : null,
    }).eq('id', editingUnitId!)
    if (error) { setEditUnitError(error.message); setUnitSaving(false); return }
    setEditingUnitId(null)
    setUnitSaving(false)
    onUnitAdded()
  }

  async function handleRemoveUnit(unitId: string) {
    setUnitRemoving(true)
    setRemoveUnitError(null)
    const { error } = await createClient().from('units').delete().eq('id', unitId)
    if (error) { setRemoveUnitError(error.message); setUnitRemoving(false); return }
    setRemovingUnitId(null)
    setUnitRemoving(false)
    onUnitAdded()
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    const res = await fetch('/api/properties/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: property.id }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setDeleteError(body.error ?? 'Something went wrong.')
      setDeleting(false)
      return
    }
    onDeleted()
  }

  const monthlyRent = property.units.reduce((s, u) => s + (u.target_rent ?? 0), 0)
  const netYield = property.current_valuation && monthlyRent > 0
    ? (((monthlyRent * 12 - (property.mortgage_monthly ?? 0) * 12) / property.current_valuation) * 100).toFixed(1)
    : null

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
        style={{ position: 'relative', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1, gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              {editing ? 'Edit property' : property.name}
            </h2>
            {!editing && (
              <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '3px 0 0' }}>
                {property.address_line1}, {property.city}, {property.postcode}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditError(null) }}
                  style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12.5, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  form="property-edit-form"
                  type="submit"
                  disabled={editSaving}
                  style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: editSaving ? 0.6 : 1 }}
                >
                  {editSaving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{ padding: '5px 12px', borderRadius: 7, fontSize: 12.5, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                Edit
              </button>
            )}
            <button
              onClick={onClose}
              style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
            >
              <IconX size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Edit form ── */}
          {editing && (
            <form id="property-edit-form" onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ModalField label="Property name" required>
                  <input
                    required
                    className="crystal-input"
                    value={editForm.name}
                    onChange={e => setEdit('name', e.target.value)}
                  />
                </ModalField>
                <ModalField label="Property type">
                  <CrystalSelect
                    value={editForm.property_type_id}
                    onChange={v => setEdit('property_type_id', v)}
                    options={propertyTypes.map(t => ({ value: t.id, label: t.label }))}
                    placeholder="Select type…"
                  />
                </ModalField>
              </div>
              <ModalField label="Street address" required>
                <input
                  required
                  className="crystal-input"
                  value={editForm.address_line1}
                  onChange={e => setEdit('address_line1', e.target.value)}
                />
              </ModalField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ModalField label="City" required>
                  <input
                    required
                    className="crystal-input"
                    value={editForm.city}
                    onChange={e => setEdit('city', e.target.value)}
                  />
                </ModalField>
                <ModalField label="Postcode" required>
                  <input
                    required
                    className="crystal-input"
                    style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
                    value={editForm.postcode}
                    onChange={e => setEdit('postcode', e.target.value.toUpperCase())}
                  />
                </ModalField>
              </div>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)' }}>
                Financial details — optional
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <ModalField label="Purchase price">
                  <PrefixInput prefix="£">
                    <input type="number" min="0" step="1000" className="crystal-input" style={{ paddingLeft: 22 }}
                      value={editForm.purchase_price} onChange={e => setEdit('purchase_price', e.target.value)} placeholder="175000" />
                  </PrefixInput>
                </ModalField>
                <ModalField label="Purchase date">
                  <CrystalDatePicker value={editForm.purchase_date} onChange={v => setEdit('purchase_date', v)} />
                </ModalField>
                <ModalField label="Mortgage/mo">
                  <PrefixInput prefix="£">
                    <input type="number" min="0" step="10" className="crystal-input" style={{ paddingLeft: 22 }}
                      value={editForm.mortgage_monthly} onChange={e => setEdit('mortgage_monthly', e.target.value)} placeholder="620" />
                  </PrefixInput>
                </ModalField>
                <ModalField label="Current valuation">
                  <PrefixInput prefix="£">
                    <input type="number" min="0" step="1000" className="crystal-input" style={{ paddingLeft: 22 }}
                      value={editForm.current_valuation} onChange={e => setEdit('current_valuation', e.target.value)} placeholder="210000" />
                  </PrefixInput>
                </ModalField>
              </div>
              {editError && (
                <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
                  {editError}
                </p>
              )}
            </form>
          )}

          {/* ── View mode ── */}
          {!editing && (
            <>
              {/* Property type + occupancy badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {property.property_types && (
                  <span className="crystal-pill">{property.property_types.label}</span>
                )}
                {property.units.length === 0 ? (
                  <span className="crystal-pill void">No units</span>
                ) : property.units.every(u => u.status === 'occupied') ? (
                  <span className="crystal-pill healthy">Fully occupied</span>
                ) : property.units.every(u => u.status === 'vacant') ? (
                  <span className="crystal-pill void">Void</span>
                ) : (
                  <span className="crystal-pill warn">Partially occupied</span>
                )}
              </div>

              {/* Financial overview */}
              {(property.purchase_price || property.current_valuation || property.mortgage_monthly || monthlyRent > 0 || netYield || property.purchase_date) && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {property.purchase_price && (
                    <DetailStat label="Purchase price" value={`£${property.purchase_price.toLocaleString('en-GB')}`} />
                  )}
                  {property.current_valuation && (
                    <DetailStat label="Valuation" value={`£${property.current_valuation.toLocaleString('en-GB')}`} />
                  )}
                  {property.mortgage_monthly && (
                    <DetailStat label="Mortgage/mo" value={`£${property.mortgage_monthly.toLocaleString('en-GB')}`} />
                  )}
                  {monthlyRent > 0 && (
                    <DetailStat label="Total rent/mo" value={`£${monthlyRent.toLocaleString('en-GB')}`} />
                  )}
                  {netYield && (
                    <DetailStat label="Net yield" value={`${netYield}%`} />
                  )}
                  {property.purchase_date && (
                    <DetailStat label="Purchased" value={fmtDate(property.purchase_date)} />
                  )}
                </div>
              )}
            </>
          )}

          {/* Units + danger zone — hidden while editing */}
          {!editing && (<><div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-mute)', margin: 0 }}>
                Units
              </p>
              <button
                onClick={() => { setShowAddUnit(v => !v); setAddError(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                <IconPlus size={11} strokeWidth={2} />
                Add unit
              </button>
            </div>

            {property.units.length === 0 && !showAddUnit && (
              <p style={{ fontSize: 12.5, color: 'var(--text-mute)', padding: '8px 0' }}>
                No units yet — add one to start tracking occupancy and rent.
              </p>
            )}

            {property.units.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {property.units.map(unit => {
                  if (editingUnitId === unit.id) {
                    return (
                      <form
                        key={unit.id}
                        onSubmit={handleSaveUnit}
                        style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--indigo)', display: 'flex', flexDirection: 'column', gap: 10 }}
                      >
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <ModalField label="Unit ref" required>
                            <input
                              required
                              className="crystal-input"
                              value={editUnitForm.unit_ref}
                              onChange={e => setEditUnitForm(f => ({ ...f, unit_ref: e.target.value }))}
                            />
                          </ModalField>
                          <ModalField label="Unit type" required>
                            <CrystalSelect
                              value={editUnitForm.unit_type_id}
                              onChange={v => setEditUnitForm(f => ({ ...f, unit_type_id: v }))}
                              options={unitTypes}
                              placeholder="Select…"
                            />
                          </ModalField>
                          <ModalField label="Target rent">
                            <PrefixInput prefix="£">
                              <input
                                type="number" min="0" step="10"
                                className="crystal-input"
                                style={{ paddingLeft: 22 }}
                                value={editUnitForm.target_rent}
                                onChange={e => setEditUnitForm(f => ({ ...f, target_rent: e.target.value }))}
                                placeholder="950"
                              />
                            </PrefixInput>
                          </ModalField>
                        </div>
                        {editUnitError && (
                          <p style={{ fontSize: 12, padding: '6px 10px', borderRadius: 7, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
                            {editUnitError}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => { setEditingUnitId(null); setEditUnitError(null) }}
                            style={{ padding: '5px 11px', borderRadius: 7, fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={unitSaving}
                            style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: unitSaving ? 0.6 : 1 }}
                          >
                            {unitSaving ? 'Saving…' : 'Save'}
                          </button>
                        </div>
                      </form>
                    )
                  }

                  if (removingUnitId === unit.id) {
                    return (
                      <div
                        key={unit.id}
                        style={{ padding: '9px 12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid rgba(251,113,133,0.3)', display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        <p style={{ fontSize: 12.5, color: 'var(--text)', margin: 0 }}>
                          Remove <strong>{unit.unit_ref}</strong>?
                        </p>
                        {removeUnitError && (
                          <p style={{ fontSize: 12, padding: '6px 10px', borderRadius: 7, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)', margin: 0 }}>
                            {removeUnitError}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => { setRemovingUnitId(null); setRemoveUnitError(null) }}
                            disabled={unitRemoving}
                            style={{ padding: '5px 11px', borderRadius: 7, fontSize: 12, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', opacity: unitRemoving ? 0.5 : 1 }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleRemoveUnit(unit.id)}
                            disabled={unitRemoving}
                            style={{ padding: '5px 13px', borderRadius: 7, fontSize: 12, fontWeight: 500, background: 'linear-gradient(180deg, #f87171, #ef4444)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)', color: '#fff', border: 'none', cursor: 'pointer', opacity: unitRemoving ? 0.6 : 1 }}
                          >
                            {unitRemoving ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={unit.id}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{unit.unit_ref}</span>
                        {unit.unit_types?.label && (
                          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{unit.unit_types.label}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {unit.target_rent != null && unit.target_rent > 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                            £{unit.target_rent.toLocaleString('en-GB')}/mo
                          </span>
                        )}
                        <span
                          className={`crystal-pill ${unit.status === 'occupied' ? 'healthy' : unit.status === 'vacant' ? 'void' : 'warn'}`}
                          style={{ fontSize: 10 }}
                        >
                          {unit.status.charAt(0).toUpperCase() + unit.status.slice(1)}
                        </span>
                        <button
                          onClick={() => startEditUnit(unit)}
                          title="Edit unit"
                          style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--indigo)'; e.currentTarget.style.background = 'rgba(129,140,248,0.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <IconPencil size={12} strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => { setRemovingUnitId(unit.id); setRemoveUnitError(null); setEditingUnitId(null) }}
                          title="Remove unit"
                          style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.background = 'rgba(251,113,133,0.1)' }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
                        >
                          <IconTrash size={12} strokeWidth={1.75} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add unit inline form */}
            <AnimatePresence>
              {showAddUnit && (
                <motion.form
                  onSubmit={handleAddUnit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      <ModalField label="Unit ref" required>
                        <input
                          required
                          className="crystal-input"
                          value={unitForm.unit_ref}
                          onChange={e => setUnit('unit_ref', e.target.value)}
                          placeholder="e.g. Flat 2A"
                        />
                      </ModalField>
                      <ModalField label="Unit type" required>
                        <CrystalSelect
                          value={unitForm.unit_type_id}
                          onChange={v => setUnit('unit_type_id', v)}
                          options={unitTypes}
                          placeholder="Select…"
                        />
                      </ModalField>
                      <ModalField label="Target rent">
                        <PrefixInput prefix="£">
                          <input
                            type="number" min="0" step="10"
                            className="crystal-input"
                            style={{ paddingLeft: 22 }}
                            value={unitForm.target_rent}
                            onChange={e => setUnit('target_rent', e.target.value)}
                            placeholder="950"
                          />
                        </PrefixInput>
                      </ModalField>
                    </div>
                    {addError && (
                      <p style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
                        {addError}
                      </p>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => { setShowAddUnit(false); setAddError(null) }}
                        style={{ padding: '6px 12px', borderRadius: 7, fontSize: 12.5, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={addSaving}
                        style={{ padding: '6px 14px', borderRadius: 7, fontSize: 12.5, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: addSaving ? 0.6 : 1 }}
                      >
                        {addSaving ? 'Adding…' : 'Add unit'}
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Danger zone */}
          {isOwner && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <p style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--rose)', marginBottom: 10, opacity: 0.7 }}>
                Danger zone
              </p>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', cursor: 'pointer', transition: 'background .15s, border-color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.14)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.2)' }}
                >
                  Delete property
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.55 }}>
                    Delete <strong>{property.name}</strong>? This permanently removes all tenancies, compliance records, and maintenance data.
                  </p>
                  {deleteError && (
                    <p style={{ fontSize: 12, padding: '7px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
                      {deleteError}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setConfirmDelete(false); setDeleteError(null) }}
                      disabled={deleting}
                      style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, #f87171, #ef4444)', boxShadow: '0 4px 14px rgba(239,68,68,0.35)', color: '#fff', border: 'none', cursor: 'pointer', opacity: deleting ? 0.6 : 1 }}
                    >
                      {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </>)}
        </div>
      </motion.div>
    </div>
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
  const [error, setError]   = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error: propErr } = await createClient().from('properties').insert({
      org_id:           orgId,
      property_type_id: form.property_type_id || null,
      name:             form.name.trim(),
      address_line1:    form.address_line1.trim(),
      city:             form.city.trim(),
      postcode:         form.postcode.trim().toUpperCase(),
      purchase_price:   form.purchase_price ? parseFloat(form.purchase_price) : null,
      purchase_date:    form.purchase_date || null,
      mortgage_monthly: form.mortgage_monthly ? parseFloat(form.mortgage_monthly) : null,
    })

    if (propErr) { setError(propErr.message); setSaving(false); return }
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
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, background .15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Property name + type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <ModalField label="Property name" required>
              <input
                required
                className="crystal-input"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. 24 Thornton Road"
              />
            </ModalField>
            <ModalField label="Property type">
              <CrystalSelect
                value={form.property_type_id}
                onChange={v => set('property_type_id', v)}
                options={propertyTypes.map(t => ({ value: t.id, label: t.label }))}
                placeholder="Select type…"
              />
            </ModalField>
          </div>

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
              <CrystalDatePicker
                value={form.purchase_date}
                onChange={v => set('purchase_date', v)}
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
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)' }}>
              {error}
            </p>
          )}

          <p style={{ fontSize: 11.5, color: 'var(--text-mute)', lineHeight: 1.5 }}>
            Units (rooms / lettable spaces) can be added after the property is created.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s, border-color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.6 : 1, transition: 'opacity .15s' }}
            >
              {saving ? 'Adding…' : 'Add property'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { orgId, properties, propertyTypes, loading, refreshProperties, currentUser } = useOrgData()
  const [showModal, setShowModal]             = useState(false)
  const [detailPropertyId, setDetailPropertyId] = useState<string | null>(null)

  const isOwner       = currentUser?.role === 'owner'
  const detailProperty = detailPropertyId ? (properties.find(p => p.id === detailPropertyId) ?? null) : null

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
                <PropertyCard
                  key={p.id}
                  property={p}
                  onViewClick={() => setDetailPropertyId(p.id)}
                />
              ))}

              {/* Dashed add card */}
              <motion.button
                variants={card}
                onClick={() => setShowModal(true)}
                style={{
                  border: '1.5px dashed var(--border-2)', borderRadius: 14, minHeight: 180,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 8, background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer',
                  transition: 'border-color .15s, color .15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--indigo)'; e.currentTarget.style.color = 'var(--indigo)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-mute)' }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

      <AnimatePresence>
        {detailProperty && orgId && (
          <PropertyDetailModal
            property={detailProperty}
            isOwner={isOwner}
            orgId={orgId}
            propertyTypes={propertyTypes}
            onClose={() => setDetailPropertyId(null)}
            onDeleted={() => { setDetailPropertyId(null); refreshProperties() }}
            onUnitAdded={() => refreshProperties()}
            onPropertyUpdated={() => refreshProperties()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
