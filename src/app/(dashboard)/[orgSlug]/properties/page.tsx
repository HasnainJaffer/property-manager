'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconPlus, IconX } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyUnit {
  id: string
  status: string
  target_rent: number | null
}

interface PropertyRow {
  id: string
  name: string
  address_line1: string
  city: string
  postcode: string
  purchase_price: number | null
  purchase_date: string | null
  current_valuation: number | null
  mortgage_monthly: number | null
  property_types: { label: string } | null
  units: PropertyUnit[]
}

interface PropertyType {
  id: string
  label: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtGBP(n: number) {
  return n.toLocaleString('en-GB')
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

// ─── Animations ───────────────────────────────────────────────────────────────

const containerVariants = {
  visible: { transition: { staggerChildren: 0.06 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PropertyRow }) {
  const units = property.units
  const total = units.length
  const occupied = units.filter(u => u.status === 'occupied').length
  const pct = total > 0 ? Math.round((occupied / total) * 100) : 0
  const isVoid = total === 0 || occupied === 0
  const isFull = total > 0 && occupied === total

  const monthlyRent = units.reduce((s, u) => s + (u.target_rent ?? 0), 0)
  const netYield =
    property.current_valuation && monthlyRent > 0
      ? (
          ((monthlyRent * 12 - (property.mortgage_monthly ?? 0) * 12) /
            property.current_valuation) *
          100
        ).toFixed(1)
      : null

  return (
    <motion.div
      variants={cardVariants}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
    >
      {/* Name + address */}
      <div className="mb-3">
        <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 truncate">
          {property.name}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
          {property.address_line1}, {property.city}, {property.postcode}
        </p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 mb-3">
        {property.property_types && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {property.property_types.label}
          </span>
        )}
        {isVoid ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            Void
          </span>
        ) : isFull ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            Occupied
          </span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Partial
          </span>
        )}
      </div>

      {/* Occupancy bar */}
      {total > 0 && (
        <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
          <div
            className={`h-full rounded-full ${
              isFull ? 'bg-emerald-500' : isVoid ? 'bg-transparent' : 'bg-amber-400'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Financials + purchase date */}
      <div className="flex items-end justify-between">
        <div>
          {monthlyRent > 0 && (
            <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 font-mono">
              £{fmtGBP(monthlyRent)}
              <span className="text-[10px] text-gray-500 font-sans">/mo</span>
            </p>
          )}
          {netYield && (
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
              {netYield}% net yield
            </p>
          )}
        </div>
        <div className="text-right">
          {property.purchase_date && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              Bought {fmtDate(property.purchase_date)}
            </p>
          )}
          {total > 0 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
              {occupied}/{total} unit{total !== 1 ? 's' : ''} occupied
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Add Property Modal ───────────────────────────────────────────────────────

function AddPropertyModal({
  orgId,
  onClose,
  onAdded,
}: {
  orgId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([])
  const [form, setForm] = useState({
    name: '',
    property_type_id: '',
    address_line1: '',
    city: '',
    postcode: '',
    purchase_price: '',
    purchase_date: '',
    mortgage_monthly: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    createClient()
      .from('property_types')
      .select('id, label')
      .order('sort_order')
      .then(({ data }) => {
        if (data?.length) {
          setPropertyTypes(data)
          setForm(f => ({ ...f, property_type_id: data[0].id }))
        }
      })
  }, [])

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await createClient()
      .from('properties')
      .insert({
        org_id: orgId,
        property_type_id: form.property_type_id,
        name: form.name.trim(),
        address_line1: form.address_line1.trim(),
        city: form.city.trim(),
        postcode: form.postcode.trim().toUpperCase(),
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        purchase_date: form.purchase_date || null,
        mortgage_monthly: form.mortgage_monthly ? parseFloat(form.mortgage_monthly) : null,
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
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">
            Add property
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          {/* Name */}
          <div>
            <label className={labelClass}>
              Property name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. 24 Thornton Road"
              className={inputClass}
            />
          </div>

          {/* Type */}
          <div>
            <label className={labelClass}>
              Property type <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.property_type_id}
              onChange={e => set('property_type_id', e.target.value)}
              className={inputClass}
            >
              {propertyTypes.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div>
            <label className={labelClass}>
              Street address <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.address_line1}
              onChange={e => set('address_line1', e.target.value)}
              placeholder="e.g. 24 Thornton Road"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>
                City <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="e.g. Manchester"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Postcode <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.postcode}
                onChange={e => set('postcode', e.target.value.toUpperCase())}
                placeholder="e.g. M1 1AA"
                className={`${inputClass} font-mono uppercase`}
              />
            </div>
          </div>

          {/* Financial section */}
          <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider pt-1">
            Financial details (optional)
          </p>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Purchase price</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">£</span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={form.purchase_price}
                  onChange={e => set('purchase_price', e.target.value)}
                  placeholder="175000"
                  className={`${inputClass} pl-5`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Purchase date</label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={e => set('purchase_date', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mortgage/mo</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">£</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.mortgage_monthly}
                  onChange={e => set('mortgage_monthly', e.target.value)}
                  placeholder="620"
                  className={`${inputClass} pl-5`}
                />
              </div>
            </div>
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
              {loading ? 'Adding…' : 'Add property'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [orgId, setOrgId] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyRow[]>([])
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

    const { data } = await supabase
      .from('properties')
      .select(`
        id, name, address_line1, city, postcode,
        purchase_price, purchase_date, current_valuation, mortgage_monthly,
        property_types ( label ),
        units ( id, status, target_rent )
      `)
      .eq('org_id', org.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    setProperties((data as unknown as PropertyRow[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  const totalUnits = properties.reduce((s, p) => s + p.units.length, 0)
  const voidUnits  = properties.reduce((s, p) => s + p.units.filter(u => u.status === 'vacant').length, 0)
  const subtitle = loading
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
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <p className="text-[12px] text-gray-400">Loading properties…</p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {properties.map(p => (
                  <PropertyCard key={p.id} property={p} />
                ))}

                {/* Dashed add card */}
                <motion.button
                  variants={cardVariants}
                  onClick={() => setShowModal(true)}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center gap-2 min-h-[180px] text-gray-400 dark:text-gray-500 hover:border-gray-400 dark:hover:border-gray-500 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                >
                  <IconPlus size={20} strokeWidth={1.5} />
                  <span className="text-[12px] font-medium">Add property</span>
                </motion.button>
              </motion.div>
            )}
          </div>
        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <AddPropertyModal
            orgId={orgId}
            onClose={() => setShowModal(false)}
            onAdded={() => { setShowModal(false); load() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
