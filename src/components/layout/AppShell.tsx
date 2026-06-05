'use client'

import { usePathname, useParams } from 'next/navigation'
import Topbar from './Topbar'
import Sidebar from './Sidebar'
import { useOrgData } from '@/lib/org-data-context'

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

export default function AppShell({ children, title, subtitle, action }: AppShellProps) {
  const { orgSlug, orgName, orgTypeLabel, currentUser } = useOrgData()
  const pathname = usePathname()
  const params   = useParams()

  const slug         = (typeof params?.orgSlug === 'string' ? params.orgSlug : '') || orgSlug
  const segments     = pathname.split('/').filter(Boolean)
  const currentPage  = segments[segments.length - 1] ?? 'dashboard'

  const firstName    = currentUser?.firstName ?? ''
  const lastName     = currentUser?.lastName  ?? ''
  const userName     = [firstName, lastName].filter(Boolean).join(' ')
  const userInitials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName ? firstName[0].toUpperCase() : '…'

  const sidebarProps = {
    currentPage,
    orgSlug:       slug,
    role:          currentUser?.role ?? 'owner',
    userName,
    userInitials,
    userRoleLabel: currentUser?.roleLabel ?? '',
    orgName:       orgName  || '—',
    orgTypeLabel:  orgTypeLabel || '—',
    badges:        { rent: 0, compliance: 0 },
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

      {/* Two-column shell */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: '100%', overflow: 'hidden' }}>

        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar {...sidebarProps} />
        </div>

        {/* Main panel */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <main
            style={{ height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
            className="crystal-scroll"
          >
            <Topbar
              title={title}
              subtitle={subtitle}
              action={action}
            />
            <div style={{ padding: '0 28px 48px' }}>
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
