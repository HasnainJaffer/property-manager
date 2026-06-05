'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCalendar, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_LABELS  = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parseISO(val: string): { year: number; month: number; day: number } | null {
  if (!val || val.length < 10) return null
  const [y, m, d] = val.split('-').map(Number)
  if (!y || !m || !d) return null
  return { year: y, month: m - 1, day: d }
}

function formatUK(val: string): string {
  const p = parseISO(val)
  if (!p) return ''
  return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}`
}

interface Cell { day: number; month: number; year: number; isCurrent: boolean }

function buildCells(viewYear: number, viewMonth: number): Cell[] {
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrev   = new Date(viewYear, viewMonth, 0).getDate()
  const firstDow     = new Date(viewYear, viewMonth, 1).getDay()
  const startOffset  = (firstDow + 6) % 7 // Mon = 0

  const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1
  const prevYear  = viewMonth === 0 ? viewYear - 1 : viewYear
  const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1
  const nextYear  = viewMonth === 11 ? viewYear + 1 : viewYear

  const cells: Cell[] = []

  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ day: daysInPrev - i, month: prevMonth, year: prevYear, isCurrent: false })

  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, month: viewMonth, year: viewYear, isCurrent: true })

  let nd = 1
  while (cells.length < 42)
    cells.push({ day: nd++, month: nextMonth, year: nextYear, isCurrent: false })

  return cells
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CrystalDatePickerProps {
  value: string           // YYYY-MM-DD or ''
  onChange: (v: string) => void
  placeholder?: string
}

export default function CrystalDatePicker({
  value,
  onChange,
  placeholder = 'DD / MM / YYYY',
}: CrystalDatePickerProps) {
  const today   = new Date()
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate())
  const parsed  = parseISO(value)

  const [open,      setOpen]      = useState(false)
  const [viewYear,  setViewYear]  = useState(parsed?.year  ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())
  const [rect,      setRect]      = useState<DOMRect | null>(null)
  const [mounted,   setMounted]   = useState(false)

  const triggerRef   = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  function handleToggle() {
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
      const p = parseISO(value)
      setViewYear(p?.year  ?? today.getFullYear())
      setViewMonth(p?.month ?? today.getMonth())
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      const t = e.target as Element
      if (containerRef.current?.contains(t)) return
      if (t.closest?.('[data-cdp-portal]')) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const cells    = useMemo(() => buildCells(viewYear, viewMonth), [viewYear, viewMonth])
  const display  = formatUK(value)

  const PICKER_H = 320
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < PICKER_H + 8

  // Nav button shared style
  const navBtn: React.CSSProperties = {
    width: 28, height: 28, borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text-dim)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'border-color .15s, color .15s',
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* ── Trigger ─────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'block',
          position: 'relative',
          padding: '8px 34px 8px 12px',
          border: `1px solid ${open ? 'var(--indigo)' : 'var(--border-2)'}`,
          borderRadius: 8,
          background: 'var(--surface-2)',
          color: display ? 'var(--text)' : 'var(--text-mute)',
          fontSize: 13,
          fontFamily: display ? 'var(--font-mono)' : 'inherit',
          letterSpacing: display ? '0.03em' : 'normal',
          lineHeight: 'inherit',
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          boxSizing: 'border-box',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.14)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {display || placeholder}
        <IconCalendar
          size={14}
          strokeWidth={1.75}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-mute)',
            pointerEvents: 'none',
          }}
        />
      </button>

      {/* ── Calendar portal ─────────────────────────────────────────────── */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              data-cdp-portal
              initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                left: rect.left,
                width: 280,
                zIndex: 9999,
                ...(openUpward
                  ? { bottom: window.innerHeight - rect.top + 4 }
                  : { top: rect.bottom + 4 }),
                background: 'var(--surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 14,
                padding: '14px 12px 12px',
                boxShadow: '0 8px 32px -6px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              {/* Month / year nav */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <button
                  type="button" onClick={prevMonth} style={navBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
                >
                  <IconChevronLeft size={13} strokeWidth={2} />
                </button>

                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>

                <button
                  type="button" onClick={nextMonth} style={navBtn}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-dim)' }}
                >
                  <IconChevronRight size={13} strokeWidth={2} />
                </button>
              </div>

              {/* Day-of-week headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {DAY_LABELS.map(d => (
                  <div key={d} style={{
                    textAlign: 'center', fontSize: 10, fontWeight: 600,
                    color: 'var(--text-mute)', paddingBottom: 6,
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((cell, i) => {
                  const iso        = toISO(cell.year, cell.month, cell.day)
                  const isSelected = iso === value
                  const isToday    = iso === todayISO
                  const isOther    = !cell.isCurrent

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { onChange(iso); setOpen(false) }}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 7,
                        border: isToday && !isSelected
                          ? '1px solid rgba(129,140,248,0.45)'
                          : '1px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(180deg, var(--indigo), var(--indigo-2))'
                          : 'transparent',
                        color: isSelected ? '#fff'
                             : isOther    ? 'var(--text-mute)'
                             : isToday    ? 'var(--indigo)'
                             : 'var(--text-dim)',
                        fontSize: 12,
                        fontWeight: isSelected || isToday ? 600 : 400,
                        cursor: 'pointer',
                        transition: 'background .1s, color .1s, border-color .1s',
                        boxShadow: isSelected ? '0 2px 8px var(--glow-i)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={e => {
                        if (!isSelected) e.currentTarget.style.background = 'var(--surface-2)'
                      }}
                      onMouseLeave={e => {
                        if (!isSelected) e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>

              {/* Today shortcut */}
              {value !== todayISO && (
                <button
                  type="button"
                  onClick={() => { onChange(todayISO); setOpen(false) }}
                  style={{
                    width: '100%', marginTop: 10,
                    padding: '6px 0',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text-dim)', fontSize: 11.5,
                    cursor: 'pointer', transition: 'color .15s, border-color .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  Today
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
