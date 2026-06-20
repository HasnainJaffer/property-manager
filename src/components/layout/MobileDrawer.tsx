'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  IconLayoutDashboard,
  IconBuildingEstate,
  IconFileText,
  IconUsers,
  IconCoinPound,
  IconShieldCheck,
  IconTool,
  IconUsersGroup,
  IconSettings,
  IconLogout,
  IconX,
} from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

// ── Nav definition (mirrors Sidebar) ─────────────────────────────────────────

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>
  badge?: 'rent' | 'compliance'
  allowedRoles: UserRole[]
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard',   label: 'Dashboard',   icon: IconLayoutDashboard, allowedRoles: ['owner','manager','accountant','staff','maintenance','viewer'] },
    ],
  },
  {
    label: 'PORTFOLIO',
    items: [
      { id: 'properties',  label: 'Properties',  icon: IconBuildingEstate,  allowedRoles: ['owner','manager','accountant','staff','maintenance','viewer'] },
      { id: 'tenancies',   label: 'Tenancies',   icon: IconFileText,        allowedRoles: ['owner','manager','accountant','viewer'] },
      { id: 'tenants',     label: 'Tenants',     icon: IconUsers,           allowedRoles: ['owner','manager','accountant','viewer'] },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { id: 'rent',        label: 'Rent Ledger', icon: IconCoinPound,       badge: 'rent',       allowedRoles: ['owner','manager','accountant'] },
    ],
  },
  {
    label: 'OPERATIONS',
    items: [
      { id: 'compliance',  label: 'Compliance',  icon: IconShieldCheck,     badge: 'compliance', allowedRoles: ['owner','manager','maintenance','viewer'] },
      { id: 'maintenance', label: 'Maintenance', icon: IconTool,            allowedRoles: ['owner','manager','staff','maintenance','viewer'] },
    ],
  },
  {
    label: 'ORGANISATION',
    items: [
      { id: 'team',        label: 'Team',        icon: IconUsersGroup,      allowedRoles: ['owner','manager'] },
      { id: 'settings',    label: 'Settings',    icon: IconSettings,        allowedRoles: ['owner','manager'] },
    ],
  },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  currentPage: string
  orgSlug: string
  role: UserRole
  userName: string
  userInitials: string
  userRoleLabel: string
  orgName: string
  orgTypeLabel: string
  badges: { rent?: number; compliance?: number }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MobileDrawer({
  open,
  onClose,
  currentPage,
  orgSlug,
  role,
  userName,
  userInitials,
  userRoleLabel,
  orgName,
  orgTypeLabel,
  badges,
}: MobileDrawerProps) {
  const router = useRouter()

  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  const visibleSections = NAV_SECTIONS
    .map(s => ({ ...s, items: s.items.filter(i => i.allowedRoles.includes(role)) }))
    .filter(s => s.items.length > 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* ── Backdrop ─────────────────────────────────────────────── */}
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, zIndex: 200,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(3px)',
              WebkitBackdropFilter: 'blur(3px)',
            }}
          />

          {/* ── Drawer panel ─────────────────────────────────────────── */}
          <motion.aside
            key="mobile-drawer"
            initial={{ x: -288 }}
            animate={{ x: 0 }}
            exit={{ x: -288 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0,
              width: 272, zIndex: 201,
              display: 'flex', flexDirection: 'column',
              padding: '16px 14px 18px',
              background: 'var(--bg)',
              borderRight: '1px solid var(--border)',
              boxShadow: '4px 0 32px rgba(0,0,0,0.5)',
            }}
          >

            {/* Brand + close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, position: 'relative', flexShrink: 0,
                  background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
                  boxShadow: '0 6px 20px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.2)',
                }}>
                  <div style={{ position: 'absolute', inset: 6, borderRadius: 4, background: 'var(--bg)' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>LetroFlow</span>
              </div>
              <button
                onClick={onClose}
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--surface-2)', border: '1px solid var(--border)',
                  color: 'var(--text-mute)', cursor: 'pointer',
                }}
              >
                <IconX size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Org card */}
            <div style={{
              padding: '10px 12px', borderRadius: 10,
              background: 'var(--surface-2)', border: '1px solid var(--border-2)',
              marginBottom: 4,
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {orgName || '—'}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                {orgTypeLabel || '—'}
              </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }} className="crystal-scroll">
              {visibleSections.map(section => (
                <div key={section.label} style={{ marginTop: 16, padding: '0 6px' }}>

                  <div style={{
                    fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: 'var(--text-mute)', margin: '4px 6px 8px',
                  }}>
                    {section.label}
                  </div>

                  {section.items.map(item => {
                    const isActive = currentPage === item.id
                    const badgeCount =
                      item.badge === 'rent'       ? badges.rent :
                      item.badge === 'compliance' ? badges.compliance :
                      undefined

                    return (
                      <Link
                        key={item.id}
                        href={`/${orgSlug}/${item.id}`}
                        onClick={onClose}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '9px 10px', borderRadius: 8,
                          marginBottom: 2, fontSize: 13.5,
                          color: isActive ? 'var(--text)' : 'var(--text-dim)',
                          background: isActive ? 'var(--surface-3)' : 'transparent',
                          border: isActive ? '1px solid var(--border-2)' : '1px solid transparent',
                          textDecoration: 'none',
                          transition: 'background .12s, color .12s',
                        }}
                      >
                        <item.icon
                          size={17}
                          strokeWidth={1.6}
                          style={{
                            flexShrink: 0,
                            color: isActive ? 'var(--indigo)' : 'var(--text-mute)',
                          }}
                        />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {badgeCount !== undefined && badgeCount > 0 && (
                          <span style={{
                            fontSize: 10.5, padding: '1px 6px', borderRadius: 6,
                            background: item.badge === 'compliance'
                              ? 'rgba(251,113,133,.12)' : 'var(--surface-3)',
                            color: item.badge === 'compliance'
                              ? 'var(--rose)' : 'var(--text-dim)',
                          }}>
                            {badgeCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </nav>

            {/* User profile card */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 10, borderRadius: 10,
              border: '1px solid var(--border-2)', background: 'var(--surface-2)',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
                color: '#fff', fontSize: 12.5, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px var(--glow-i)',
              }}>
                {userInitials || '…'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {userName || 'Loading…'}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{userRoleLabel}</div>
              </div>
              <button
                onClick={handleSignOut}
                title="Sign out"
                style={{
                  color: 'var(--text-mute)', cursor: 'pointer',
                  padding: 4, borderRadius: 6,
                  border: 'none', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-mute)')}
              >
                <IconLogout size={15} strokeWidth={1.75} />
              </button>
            </div>

          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
