'use client'

import { useState, useEffect } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import StaggeredMenu from './StaggeredMenu'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/lib/types'

interface AppShellAction {
  label: string
  onClick?: () => void
}

interface AppShellProps {
  children: React.ReactNode
  title: string
  subtitle: string
  action?: AppShellAction
}

interface ShellData {
  firstName: string
  lastName: string
  role: UserRole
  roleLabel: string
  orgName: string
  orgTypeLabel: string
}

export default function AppShell({ children, title, subtitle, action }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [shellData, setShellData] = useState<ShellData | null>(null)
  const pathname = usePathname()
  const params = useParams()
  const router = useRouter()

  const orgSlug = typeof params?.orgSlug === 'string' ? params.orgSlug : ''
  const segments = pathname.split('/').filter(Boolean)
  const currentPage = segments[segments.length - 1] ?? 'dashboard'

  useEffect(() => {
    if (!orgSlug) return

    async function load() {
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: org } = await supabase
        .from('organisations')
        .select('id, name, organisation_type_id')
        .eq('slug', orgSlug)
        .single()

      if (!org) { router.replace('/onboarding'); return }

      const [{ data: orgType }, { data: profile }] = await Promise.all([
        supabase.from('organisation_types').select('label').eq('id', org.organisation_type_id).single(),
        supabase.from('profiles').select('first_name, last_name, role_id').eq('user_id', user.id).eq('org_id', org.id).single(),
      ])

      if (!profile) { router.replace('/onboarding'); return }

      const { data: roleRow } = await supabase
        .from('roles')
        .select('name, label')
        .eq('id', profile.role_id)
        .single()

      setShellData({
        firstName:    profile.first_name ?? '',
        lastName:     profile.last_name ?? '',
        role:         (roleRow?.name ?? 'owner') as UserRole,
        roleLabel:    roleRow?.label ?? '',
        orgName:      org.name,
        orgTypeLabel: orgType?.label ?? '',
      })
    }

    load()
  }, [orgSlug, router])

  const firstName    = shellData?.firstName ?? ''
  const lastName     = shellData?.lastName ?? ''
  const userName     = [firstName, lastName].filter(Boolean).join(' ')
  const userInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName ? firstName[0].toUpperCase() : '…'

  // Badges wired to live counts when rent/compliance tables are active
  const badges = { rent: 0, compliance: 0 }

  const sidebarProps = {
    currentPage,
    orgSlug,
    role:         shellData?.role ?? 'owner' as UserRole,
    userName,
    userInitials,
    userRoleLabel: shellData?.roleLabel ?? '',
    orgName:       shellData?.orgName ?? '',
    orgTypeLabel:  shellData?.orgTypeLabel ?? '',
    badges,
  }

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* Ambient gradient blobs — Crystal aesthetic */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -180, left: -120,
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(closest-side, var(--bg-grad-1), transparent 70%)',
          filter: 'blur(80px)', opacity: 0.8,
          pointerEvents: 'none', zIndex: 0,
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute', bottom: -200, right: -160,
          width: 620, height: 620, borderRadius: '50%',
          background: 'radial-gradient(closest-side, var(--bg-grad-2), transparent 70%)',
          filter: 'blur(80px)', opacity: 0.8,
          pointerEvents: 'none', zIndex: 0,
        }}
      />

      {/* Mobile drawer (z-50, portal-style overlay) */}
      <StaggeredMenu
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...sidebarProps}
      />

      {/* Two-column shell */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Desktop sidebar — hidden on mobile */}
        <div className="hidden md:flex">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Topbar
            title={title}
            subtitle={subtitle}
            action={action}
            onMobileMenuOpen={() => setDrawerOpen(true)}
          />
          <main
            style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '0 28px 36px' }}
            className="crystal-scroll"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
