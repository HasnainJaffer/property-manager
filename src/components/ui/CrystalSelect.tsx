'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { IconChevronDown, IconCheck } from '@tabler/icons-react'

export interface SelectOption {
  value: string
  label: string
}

interface CrystalSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

export default function CrystalSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
}: CrystalSelectProps) {
  const [open, setOpen]       = useState(false)
  const [rect, setRect]       = useState<DOMRect | null>(null)
  const [mounted, setMounted] = useState(false)
  const triggerRef            = useRef<HTMLButtonElement>(null)
  const containerRef          = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  function handleToggle() {
    if (!open && triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect())
    }
    setOpen(o => !o)
  }

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      const target = e.target as Element
      if (containerRef.current?.contains(target)) return
      if (target.closest?.('[data-cs-portal]')) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const selected = options.find(o => o.value === value)

  // Flip upward if there isn't enough room below the trigger
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const dropHeight = Math.min(options.length * 38 + 8, 240)
  const openUpward = spaceBelow < dropHeight + 8

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>

      {/* ── Trigger ──────────────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          border: `1px solid ${open ? 'var(--indigo)' : 'var(--border-2)'}`,
          borderRadius: 8,
          background: 'var(--surface-2)',
          color: selected ? 'var(--text)' : 'var(--text-mute)',
          fontSize: 13,
          textAlign: 'left',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: open ? '0 0 0 3px rgba(99,102,241,0.14)' : 'none',
          transition: 'border-color .15s, box-shadow .15s',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected ? selected.label : placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', color: 'var(--text-mute)' }}
        >
          <IconChevronDown size={14} strokeWidth={2} />
        </motion.span>
      </button>

      {/* ── Dropdown (portal — renders above all overflow containers) ──── */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              data-cs-portal
              initial={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: openUpward ? 6 : -6, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                left: rect.left,
                width: rect.width,
                zIndex: 9999,
                ...(openUpward
                  ? { bottom: window.innerHeight - rect.top + 4 }
                  : { top: rect.bottom + 4 }),
                background: 'var(--surface)',
                border: '1px solid var(--border-2)',
                borderRadius: 10,
                overflow: 'hidden',
                boxShadow: '0 8px 32px -6px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.06) inset',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                maxHeight: 240,
                overflowY: 'auto',
              }}
              className="crystal-scroll"
            >
              {options.map((opt, i) => {
                const isSelected = opt.value === value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false) }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 12px',
                      fontSize: 13,
                      color: isSelected ? 'var(--indigo)' : 'var(--text-dim)',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: i < options.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 500 : 400,
                      transition: 'background .1s, color .1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--surface-2)'
                      if (!isSelected) e.currentTarget.style.color = 'var(--text)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      if (!isSelected) e.currentTarget.style.color = 'var(--text-dim)'
                    }}
                  >
                    <span style={{ width: 16, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isSelected && <IconCheck size={13} strokeWidth={2.5} style={{ color: 'var(--indigo)' }} />}
                    </span>
                    {opt.label}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
