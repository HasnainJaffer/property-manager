'use client'

import Link from 'next/link'
import { motion, LayoutGroup } from 'framer-motion'
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
} from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

// ── Nav definition ────────────────────────────────────────────────────────────

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

interface SidebarProps {
  currentPage: string
  orgSlug: string
  role?: UserRole
  userName?: string
  userInitials?: string
  userRoleLabel?: string
  orgName?: string
  orgTypeLabel?: string
  badges?: { rent?: number; compliance?: number }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar({
  currentPage,
  orgSlug,
  role = 'owner',
  userName = '',
  userInitials = '',
  userRoleLabel = '',
  orgName = '',
  orgTypeLabel = '',
  badges = {},
}: SidebarProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const visibleSections = NAV_SECTIONS
    .map(s => ({ ...s, items: s.items.filter(i => i.allowedRoles.includes(role)) }))
    .filter(s => s.items.length > 0)

  return (
    <aside style={{
      width: 248,
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px 14px 18px',
      borderRight: '1px solid var(--border)',
      background: 'linear-gradient(180deg, var(--surface) 0%, transparent 90%)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'relative',
      zIndex: 2,
    }}>

      {/* ── Brand ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 14px' }}>
        {/* Conic-gradient mark with hollow centre */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, position: 'relative', flexShrink: 0,
          background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
          boxShadow: '0 6px 20px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.2)',
        }}>
          <div style={{
            position: 'absolute', inset: 6, borderRadius: 4,
            background: 'var(--bg)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
          }} />
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          PropFlow
        </span>
      </div>

      {/* ── Org card ────────────────────────────────────────────────── */}
      <div style={{
        padding: '10px 12px', borderRadius: 10,
        background: 'var(--surface-2)', border: '1px solid var(--border-2)',
        display: 'flex', flexDirection: 'column', gap: 2,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {orgName || '—'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
          {orgTypeLabel || '—'}
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }} className="crystal-scroll">
        <LayoutGroup id="sidebar-nav">
          {visibleSections.map(section => (
            <div key={section.label} style={{ marginTop: 16, padding: '0 6px' }}>

              {/* Section heading */}
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
                  <div key={item.id} style={{ position: 'relative', marginBottom: 2 }}>

                    {/* Sliding active background */}
                    {isActive && (
                      <motion.div
                        layoutId="nav-active"
                        style={{
                          position: 'absolute', inset: 0, borderRadius: 8,
                          background: 'var(--surface-3)',
                          border: '1px solid var(--border-2)',
                          boxShadow: '0 0 0 1px var(--border) inset, 0 2px 6px rgba(0,0,0,.18)',
                        }}
                        transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                      />
                    )}

                    <Link
                      href={`/${orgSlug}/${item.id}`}
                      className={isActive ? undefined : 'crystal-nav-link'}
                      style={{
                        position: 'relative', zIndex: 1,
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '7px 10px', borderRadius: 8,
                        fontSize: 13.5,
                        color: isActive ? 'var(--text)' : 'var(--text-dim)',
                        border: '1px solid transparent',
                        transition: 'color .15s',
                        textDecoration: 'none',
                      }}
                    >
                      <item.icon
                        size={17}
                        strokeWidth={1.6}
                        style={{
                          flexShrink: 0,
                          color: isActive ? 'var(--indigo)' : 'var(--text-mute)',
                          transition: 'color .15s',
                        }}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>

                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span style={{
                          fontSize: 10.5, padding: '1px 6px', borderRadius: 6,
                          background: item.badge === 'compliance'
                            ? 'rgba(251,113,133,.12)'
                            : 'var(--surface-3)',
                          color: item.badge === 'compliance'
                            ? 'var(--rose)'
                            : 'var(--text-dim)',
                        }}>
                          {badgeCount}
                        </span>
                      )}
                    </Link>
                  </div>
                )
              })}
            </div>
          ))}
        </LayoutGroup>
      </nav>

      {/* ── User profile card — matches org card styling ────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: 10, borderRadius: 10,
        border: '1px solid var(--border-2)', background: 'var(--surface-2)',
      }}>
        {/* Gradient avatar */}
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
          <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
            {userRoleLabel}
          </div>
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
    </aside>
  )
}
