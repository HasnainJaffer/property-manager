'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface IssueRow {
  id: string
  title: string
  description: string | null
  source: string
  priority: string
  status: string
  reported_date: string
  scheduled_date: string | null
  estimated_cost: number | null
  properties: { name: string } | null
  units: { unit_ref: string } | null
}

interface PropertyOption {
  id: string
  name: string
  units: Array<{ id: string; unit_ref: string }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
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

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === 'emergency') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Emergency</span>
  )
  if (priority === 'urgent') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
  )
  if (priority === 'high') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">High</span>
  )
  if (priority === 'medium') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Medium</span>
  )
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Low</span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Completed</span>
  )
  if (status === 'in_progress') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</span>
  )
  if (status === 'scheduled') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Scheduled</span>
  )
  if (status === 'cancelled') return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Cancelled</span>
  )
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">Open</span>
  )
}

// ─── Log Issue Modal ──────────────────────────────────────────────────────────

function LogIssueModal({
  orgId,
  properties,
  onClose,
  onLogged,
}: {
  orgId: string
  properties: PropertyOption[]
  onClose: () => void
  onLogged: () => void
}) {
  const [form, setForm] = useState({
    property_id: properties[0]?.id ?? '',
    unit_id: '',
    title: '',
    description: '',
    source: 'tenant',
    priority: 'medium',
    reported_date: new Date().toISOString().slice(0, 10),
    estimated_cost: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedProperty = properties.find(p => p.id === form.property_id)

  function set(k: keyof typeof form, v: string) {
    setForm(f => {
      const next = { ...f, [k]: v }
      if (k === 'property_id') next.unit_id = ''
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await createClient()
      .from('issues')
      .insert({
        org_id: orgId,
        property_id: form.property_id,
        unit_id: form.unit_id || null,
        title: form.title.trim(),
        description: form.description.trim() || null,
        source: form.source,
        priority: form.priority,
        reported_date: form.reported_date,
        estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : null,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    onLogged()
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h2 className="text-[14px] font-medium text-gray-900 dark:text-gray-100">Log maintenance issue</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
          <div>
            <label className={labelClass}>Issue title <span className="text-red-500">*</span></label>
            <input
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Boiler not producing hot water"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Property <span className="text-red-500">*</span></label>
              <select required value={form.property_id} onChange={e => set('property_id', e.target.value)} className={inputClass}>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Unit (optional)</label>
              <select value={form.unit_id} onChange={e => set('unit_id', e.target.value)} className={inputClass}>
                <option value="">Whole property</option>
                {selectedProperty?.units.map(u => <option key={u.id} value={u.id}>{u.unit_ref}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Priority <span className="text-red-500">*</span></label>
              <select required value={form.priority} onChange={e => set('priority', e.target.value)} className={inputClass}>
                <option value="emergency">Emergency</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className={inputClass}>
                <option value="tenant">Tenant</option>
                <option value="manager">Manager</option>
                <option value="inspection">Inspection</option>
                <option value="routine">Routine</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Reported date</label>
              <input type="date" value={form.reported_date} onChange={e => set('reported_date', e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Est. cost</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">£</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="150"
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
            <button type="button" onClick={onClose} className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[13px] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-3 py-1.5 rounded bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[13px] font-medium hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors disabled:opacity-50">
              {loading ? 'Logging…' : 'Log issue'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaintenancePage() {
  const params = useParams()
  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''

  const [orgId, setOrgId] = useState<string | null>(null)
  const [issues, setIssues] = useState<IssueRow[]>([])
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

    const [{ data: issueData }, { data: propData }] = await Promise.all([
      supabase
        .from('issues')
        .select(`
          id, title, description, source, priority, status,
          reported_date, scheduled_date, estimated_cost,
          properties ( name ),
          units ( unit_ref )
        `)
        .eq('org_id', org.id)
        .eq('is_active', true)
        .order('reported_date', { ascending: false }),
      supabase
        .from('properties')
        .select('id, name, units ( id, unit_ref )')
        .eq('org_id', org.id)
        .eq('is_active', true)
        .order('name', { ascending: true }),
    ])

    setIssues((issueData as unknown as IssueRow[]) ?? [])
    setProperties((propData as unknown as PropertyOption[]) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => { load() }, [load])

  const openCount = issues.filter(i => i.status === 'open').length
  const urgentCount = issues.filter(i => i.priority === 'emergency' || i.priority === 'urgent').length
  const subtitle = loading
    ? 'Loading…'
    : `${issues.length} issue${issues.length !== 1 ? 's' : ''} · ${openCount} open${urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}`

  return (
    <>
      <AppShell
        title="Maintenance"
        subtitle={subtitle}
        action={{ label: 'Log Issue', onClick: () => setShowModal(true) }}
      >
        <PageWrapper>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <p className="text-[12px] text-gray-400">Loading issues…</p>
              </div>
            ) : issues.length === 0 ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <p className="text-[13px] font-medium text-gray-900 dark:text-gray-100 mb-1">No issues logged</p>
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">Log an issue to start tracking maintenance.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Issue</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Property</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Reported</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Priority</th>
                      <th className="text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider py-2.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                    {issues.map((issue, i) => (
                      <motion.tr
                        key={issue.id}
                        variants={rowVariants}
                        className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors ${
                          i < issues.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <p className="text-[12px] font-medium text-gray-900 dark:text-gray-100">{issue.title}</p>
                          {issue.source && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 capitalize">
                              {issue.source === 'inspection' ? 'Via inspection' : `Via ${issue.source}`}
                            </p>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          <p className="text-[12px] text-gray-700 dark:text-gray-300">
                            {issue.properties?.name ?? '—'}
                          </p>
                          {issue.units?.unit_ref && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{issue.units.unit_ref}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-[11px] font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {fmtDate(issue.reported_date)}
                        </td>
                        <td className="py-2.5 px-4">
                          <PriorityBadge priority={issue.priority} />
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={issue.status} />
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
          <LogIssueModal
            orgId={orgId}
            properties={properties}
            onClose={() => setShowModal(false)}
            onLogged={() => { setShowModal(false); load() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
