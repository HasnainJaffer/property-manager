'use client'

import { useState, useEffect } from 'react'
import { IconBell, IconSearch, IconSun, IconMoon, IconMenu2 } from '@tabler/icons-react'

interface TopbarAction {
  label: string
  onClick?: () => void
}

interface TopbarProps {
  title: string
  subtitle: string
  action?: TopbarAction
  onMenuOpen?: () => void
}

export default function Topbar({ title, subtitle, action, onMenuOpen }: TopbarProps) {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    const theme = saved ?? document.documentElement.getAttribute('data-theme') ?? 'dark'
    setIsDark(theme !== 'light')
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : 'dark')
  }, [])

  function toggleTheme() {
    const next = isDark ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
    setIsDark(!isDark)
  }

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 10,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '18px 28px 22px',
      background: 'linear-gradient(180deg, var(--bg) 62%, transparent)',
      gap: 16,
    }}>

      {/* Left — hamburger (mobile) + title + subtitle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          onClick={onMenuOpen}
          aria-label="Open menu"
          className="flex md:hidden"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', cursor: 'pointer',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <IconMenu2 size={16} strokeWidth={1.75} />
        </button>

        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 19, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, margin: 0 }}>
            {title}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.4, margin: '2px 0 0' }}>
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right — search + theme + bell + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>

        {/* Search bar */}
        <div
          className="hidden sm:flex"
          style={{
            alignItems: 'center', gap: 8,
            padding: '0 12px', height: 34, borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            cursor: 'text', minWidth: 200,
          }}
        >
          <IconSearch size={14} strokeWidth={1.75} style={{ color: 'var(--text-mute)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-mute)', flex: 1, userSelect: 'none' }}>
            Search properties, tenants…
          </span>
          <kbd style={{
            fontSize: 10.5, padding: '1px 5px', borderRadius: 4,
            background: 'var(--surface-2)', border: '1px solid var(--border-2)',
            color: 'var(--text-mute)', fontFamily: 'inherit', lineHeight: 1.6,
          }}>
            ⌘K
          </kbd>
        </div>

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="crystal-icon-btn"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', cursor: 'pointer',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          {isDark
            ? <IconSun  size={15} strokeWidth={1.75} />
            : <IconMoon size={15} strokeWidth={1.75} />
          }
        </button>

        {/* Notifications bell */}
        <button
          type="button"
          aria-label="Notifications"
          style={{
            position: 'relative',
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface)', border: '1px solid var(--border)',
            color: 'var(--text-dim)', cursor: 'pointer',
            transition: 'color .15s, border-color .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-2)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >
          <IconBell size={15} strokeWidth={1.75} />
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--rose)',
            boxShadow: '0 0 0 1.5px var(--bg)',
            pointerEvents: 'none',
          }} />
        </button>

        {/* Primary action */}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 34, borderRadius: 8,
              background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
              boxShadow: '0 4px 16px var(--glow-i)',
              color: '#fff', fontSize: 13, fontWeight: 500,
              border: 'none', cursor: 'pointer', flexShrink: 0,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
