'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconChevronDown } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { createClient } from '@/lib/supabase/client'
import { useOrgData, type IssueRow } from '@/lib/org-data-context'
import CrystalSelect from '@/components/ui/CrystalSelect'
import CrystalDatePicker from '@/components/ui/CrystalDatePicker'

const PRIORITY_OPTIONS = [
  { value: 'emergency', label: 'Emergency' },
  { value: 'urgent',    label: 'Urgent' },
  { value: 'high',      label: 'High' },
  { value: 'medium',    label: 'Medium' },
  { value: 'low',       label: 'Low' },
]

const SOURCE_OPTIONS = [
  { value: 'tenant',     label: 'Tenant' },
  { value: 'manager',    label: 'Manager' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'routine',    label: 'Routine' },
  { value: 'other',      label: 'Other' },
]

// PropertyOption type used by modal — derived from context properties
interface PropertyOption {
  id: string
  name: string
  units: Array<{ id: string; unit_ref: string }>
}

// ─── Kanban config ────────────────────────────────────────────────────────────

const COLUMNS: Array<{ key: string; label: string; accent: string }> = [
  { key: 'open',        label: 'Open',        accent: 'var(--rose)'   },
  { key: 'scheduled',   label: 'Scheduled',   accent: 'var(--indigo)' },
  { key: 'in_progress', label: 'In Progress', accent: 'var(--amber)'  },
  { key: 'completed',   label: 'Completed',   accent: 'var(--mint)'   },
]

const STATUS_OPTIONS = [
  { value: 'open',        label: 'Open'        },
  { value: 'scheduled',   label: 'Scheduled'   },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed'   },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function priorityAccent(priority: string): string {
  if (priority === 'emergency' || priority === 'urgent') return 'var(--rose)'
  if (priority === 'high' || priority === 'medium') return 'var(--amber)'
  return 'var(--border-2)'
}

function sourceLabel(source: string): string {
  if (source === 'inspection') return 'Via inspection'
  if (source === 'routine') return 'Routine check'
  return `Via ${source}`
}

// ─── Animations ───────────────────────────────────────────────────────────────

const colStagger  = { visible: { transition: { staggerChildren: 0.06 } } }
const cardAnim    = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.18 } } }
const mobileStagger = { visible: { transition: { staggerChildren: 0.05 } } }
const mobileCard    = { hidden: { opacity: 0, y: 5 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Priority badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string }) {
  const label = priority.charAt(0).toUpperCase() + priority.slice(1)
  if (priority === 'emergency' || priority === 'urgent') {
    return <span className="crystal-pill arrears dot" style={{ fontSize: 10 }}>{label}</span>
  }
  if (priority === 'high' || priority === 'medium') {
    return <span className="crystal-pill warn" style={{ fontSize: 10 }}>{label}</span>
  }
  return <span className="crystal-pill void" style={{ fontSize: 10 }}>{label}</span>
}

// ─── Status dropdown ──────────────────────────────────────────────────────────

function StatusDropdown({
  issueId,
  current,
  onChange,
}: {
  issueId: string
  current: string
  onChange: (id: string, status: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          padding: '3px 7px', borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text-dim)', fontSize: 10, cursor: 'pointer',
          transition: 'border-color .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-2)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        Move
        <IconChevronDown size={9} strokeWidth={2} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.1 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 40,
              background: 'var(--surface)', border: '1px solid var(--border-2)',
              borderRadius: 10, overflow: 'hidden', minWidth: 130,
              boxShadow: '0 8px 24px -4px rgba(0,0,0,0.4)',
            }}
          >
            {STATUS_OPTIONS.filter(o => o.value !== current).map(opt => (
              <button
                key={opt.value}
                onClick={e => { e.stopPropagation(); onChange(issueId, opt.value); setOpen(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '8px 12px', fontSize: 12, color: 'var(--text-dim)',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  transition: 'background .1s, color .1s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--surface-2)'
                  e.currentTarget.style.color = 'var(--text)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-dim)'
                }}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({
  issue,
  onStatusChange,
}: {
  issue: IssueRow
  onStatusChange: (id: string, status: string) => void
}) {
  const accent = priorityAccent(issue.priority)

  return (
    <motion.div
      variants={cardAnim}
      layout
      layoutId={issue.id}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '11px 12px',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 12px -4px rgba(0,0,0,0.22)',
        cursor: 'default',
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-2)'
        e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 20px -4px rgba(0,0,0,0.32)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 12px -4px rgba(0,0,0,0.22)'
      }}
    >
      {/* Title + source */}
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35 }}>
        {issue.title}
      </p>
      {issue.source && (
        <p style={{ margin: '3px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>
          {sourceLabel(issue.source)}
        </p>
      )}

      {/* Property */}
      {issue.properties?.name && (
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-dim)' }}>
          {issue.properties.name}
          {issue.units?.unit_ref && (
            <span style={{ color: 'var(--text-mute)', marginLeft: 4 }}>
              · {issue.units.unit_ref}
            </span>
          )}
        </p>
      )}

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PriorityBadge priority={issue.priority} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)' }}>
            {fmtDate(issue.reported_date)}
          </span>
        </div>
        <StatusDropdown issueId={issue.id} current={issue.status} onChange={onStatusChange} />
      </div>

      {issue.estimated_cost != null && (
        <p style={{ margin: '6px 0 0', fontSize: 10.5, color: 'var(--text-mute)' }}>
          Est.{' '}
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
            £{issue.estimated_cost.toLocaleString('en-GB')}
          </span>
        </p>
      )}
    </motion.div>
  )
}

// ─── Mobile issue card (no layoutId — avoids Framer Motion conflicts) ────────

function MobileIssueCard({
  issue,
  onStatusChange,
}: {
  issue: IssueRow
  onStatusChange: (id: string, status: string) => void
}) {
  const accent = priorityAccent(issue.priority)
  return (
    <motion.div
      variants={mobileCard}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 10,
        padding: '12px 14px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 4px 12px -4px rgba(0,0,0,0.22)',
      }}
    >
      <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--text)', lineHeight: 1.35 }}>
        {issue.title}
      </p>
      {issue.source && (
        <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-mute)' }}>
          {sourceLabel(issue.source)}
        </p>
      )}
      {issue.properties?.name && (
        <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--text-dim)' }}>
          {issue.properties.name}
          {issue.units?.unit_ref && (
            <span style={{ color: 'var(--text-mute)', marginLeft: 4 }}>· {issue.units.unit_ref}</span>
          )}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PriorityBadge priority={issue.priority} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-mute)' }}>
            {fmtDate(issue.reported_date)}
          </span>
        </div>
        <StatusDropdown issueId={issue.id} current={issue.status} onChange={onStatusChange} />
      </div>
      {issue.estimated_cost != null && (
        <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-mute)' }}>
          Est. <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>£{issue.estimated_cost.toLocaleString('en-GB')}</span>
        </p>
      )}
    </motion.div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col,
  issues,
  onStatusChange,
}: {
  col: typeof COLUMNS[number]
  issues: IssueRow[]
  onStatusChange: (id: string, status: string) => void
}) {
  return (
    <div style={{ flex: '1 1 0', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 0 12px',
        borderBottom: `2px solid ${col.accent}`,
        marginBottom: 12,
      }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.01em' }}>
          {col.label}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 20, height: 18, padding: '0 5px', borderRadius: 6,
          fontSize: 10, fontWeight: 600,
          background: issues.length > 0 ? `${col.accent}22` : 'var(--surface-2)',
          color: issues.length > 0 ? col.accent : 'var(--text-mute)',
          border: issues.length > 0 ? `1px solid ${col.accent}44` : '1px solid var(--border)',
        }}>
          {issues.length}
        </span>
      </div>

      {/* Cards */}
      <motion.div
        variants={colStagger}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
      >
        {issues.length === 0 ? (
          <div style={{
            border: '1px dashed var(--border)',
            borderRadius: 10,
            padding: '24px 16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 11, color: 'var(--text-mute)', margin: 0 }}>No issues</p>
          </div>
        ) : (
          issues.map(issue => (
            <IssueCard key={issue.id} issue={issue} onStatusChange={onStatusChange} />
          ))
        )}
      </motion.div>
    </div>
  )
}

// ─── Log Issue Modal ──────────────────────────────────────────────────────────

function MF({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 5 }}>
        {label}{required && <span style={{ color: 'var(--rose)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

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

    if (error) { setError(error.message); setLoading(false); return }
    onLogged()
  }

  return (
    <div className="crystal-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: 'absolute', inset: 0 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="crystal-modal crystal-scroll"
        style={{ position: 'relative', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
            Log maintenance issue
          </h2>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-dim)', cursor: 'pointer',
            }}
          >
            <IconX size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <MF label="Issue title" required>
            <input
              required
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Boiler not producing hot water"
              className="crystal-input"
            />
          </MF>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Property" required>
              <CrystalSelect
                value={form.property_id}
                onChange={v => set('property_id', v)}
                options={properties.map(p => ({ value: p.id, label: p.name }))}
                placeholder="Select property…"
              />
            </MF>
            <MF label="Unit (optional)">
              <CrystalSelect
                value={form.unit_id}
                onChange={v => set('unit_id', v)}
                options={[
                  { value: '', label: 'Whole property' },
                  ...(selectedProperty?.units.map(u => ({ value: u.id, label: u.unit_ref })) ?? []),
                ]}
              />
            </MF>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Priority" required>
              <CrystalSelect
                value={form.priority}
                onChange={v => set('priority', v)}
                options={PRIORITY_OPTIONS}
              />
            </MF>
            <MF label="Source">
              <CrystalSelect
                value={form.source}
                onChange={v => set('source', v)}
                options={SOURCE_OPTIONS}
              />
            </MF>
          </div>

          <MF label="Description">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Describe the issue in detail…"
              rows={3}
              className="crystal-input"
              style={{ resize: 'none' }}
            />
          </MF>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MF label="Reported date">
              <CrystalDatePicker
                value={form.reported_date}
                onChange={v => set('reported_date', v)}
              />
            </MF>
            <MF label="Est. cost">
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text-mute)', pointerEvents: 'none' }}>£</span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={form.estimated_cost}
                  onChange={e => set('estimated_cost', e.target.value)}
                  placeholder="150"
                  className="crystal-input"
                  style={{ paddingLeft: 22 }}
                />
              </div>
            </MF>
          </div>

          {error && (
            <p style={{
              fontSize: 11, color: 'var(--rose)', padding: '8px 12px',
              background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.2)',
              borderRadius: 8, margin: 0,
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: '1px solid var(--border)', background: 'var(--surface)',
                color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer',
                transition: 'border-color .15s, color .15s',
              }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                boxShadow: '0 4px 14px var(--glow-i)',
                color: '#fff', fontSize: 13, fontWeight: 500,
                opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
              }}
            >
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
  const { orgId, issues, properties: ctxProperties, loading, refreshIssues, updateIssueStatus } = useOrgData()
  const [showModal,    setShowModal]    = useState(false)
  const [selectedTab,  setSelectedTab]  = useState('open')

  // Derive property options with units from cached properties
  const properties: PropertyOption[] = ctxProperties.map(p => ({
    id: p.id,
    name: p.name,
    units: p.units.map(u => ({ id: u.id, unit_ref: u.unit_ref })),
  }))

  const handleStatusChange = updateIssueStatus

  const openCount   = issues.filter(i => i.status === 'open').length
  const urgentCount = issues.filter(i => i.priority === 'emergency' || i.priority === 'urgent').length
  const subtitle    = loading
    ? 'Loading…'
    : `${issues.length} issue${issues.length !== 1 ? 's' : ''} · ${openCount} open${urgentCount > 0 ? ` · ${urgentCount} urgent` : ''}`

  const issuesByColumn = COLUMNS.reduce<Record<string, IssueRow[]>>((acc, col) => {
    acc[col.key] = issues.filter(i => i.status === col.key)
    return acc
  }, {})

  return (
    <>
      <AppShell
        title="Maintenance"
        subtitle={subtitle}
        action={{ label: 'Log Issue', onClick: () => setShowModal(true) }}
      >
        <PageWrapper>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading issues…</p>
            </div>
          ) : (
            <>
              {/* ── Desktop: Kanban board ──────────────────────────────── */}
              <div className="hidden md:flex" style={{ gap: 16, alignItems: 'flex-start' }}>
                {COLUMNS.map(col => (
                  <KanbanColumn
                    key={col.key}
                    col={col}
                    issues={issuesByColumn[col.key] ?? []}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>

              {/* ── Mobile: Tab bar + single-column list ──────────────── */}
              <div className="flex md:hidden flex-col" style={{ gap: 12 }}>

                {/* Tab bar */}
                <div style={{
                  display: 'flex', gap: 4, padding: 4,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 12,
                }}>
                  {COLUMNS.map(col => {
                    const count    = issuesByColumn[col.key]?.length ?? 0
                    const isActive = selectedTab === col.key
                    return (
                      <button
                        key={col.key}
                        type="button"
                        onClick={() => setSelectedTab(col.key)}
                        style={{
                          flex: 1, position: 'relative',
                          padding: '7px 2px', borderRadius: 8,
                          border: 'none', cursor: 'pointer',
                          background: 'transparent',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        }}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="mobile-tab-active"
                            style={{
                              position: 'absolute', inset: 0, borderRadius: 8,
                              background: 'var(--surface-2)',
                              border: `1.5px solid ${col.accent}`,
                            }}
                            transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                          />
                        )}
                        <span style={{
                          position: 'relative', zIndex: 1,
                          fontSize: 10.5, fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'var(--text)' : 'var(--text-mute)',
                          whiteSpace: 'nowrap',
                        }}>
                          {col.label}
                        </span>
                        <span style={{
                          position: 'relative', zIndex: 1,
                          fontSize: 10, fontWeight: 600,
                          padding: '1px 6px', borderRadius: 5,
                          background: isActive && count > 0 ? `${col.accent}22` : 'var(--surface-2)',
                          color: isActive && count > 0 ? col.accent : 'var(--text-mute)',
                          border: isActive && count > 0 ? `1px solid ${col.accent}44` : '1px solid var(--border)',
                        }}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* Issue list for selected tab */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.14 }}
                    variants={mobileStagger}
                  >
                    {(issuesByColumn[selectedTab] ?? []).length === 0 ? (
                      <div style={{
                        border: '1px dashed var(--border)', borderRadius: 10,
                        padding: '36px 16px', textAlign: 'center',
                      }}>
                        <p style={{ fontSize: 12, color: 'var(--text-mute)', margin: 0 }}>
                          No {COLUMNS.find(c => c.key === selectedTab)?.label.toLowerCase()} issues
                        </p>
                      </div>
                    ) : (
                      <motion.div
                        variants={mobileStagger}
                        initial="hidden"
                        animate="visible"
                        style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
                      >
                        {(issuesByColumn[selectedTab] ?? []).map(issue => (
                          <MobileIssueCard
                            key={issue.id}
                            issue={issue}
                            onStatusChange={handleStatusChange}
                          />
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

              </div>
            </>
          )}

        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <LogIssueModal
            orgId={orgId}
            properties={properties}
            onClose={() => setShowModal(false)}
            onLogged={() => { setShowModal(false); refreshIssues() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
