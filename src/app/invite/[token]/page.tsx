import { createAdminClient } from '@/lib/supabase/admin'
import InviteAcceptCard from './InviteAcceptCard'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite, error: inviteError } = await admin
    .from('invitations')
    .select(`
      id, email, expires_at, accepted_at, invited_by, org_id,
      organisations ( name, slug ),
      roles ( label )
    `)
    .eq('token', token)
    .single()

  // Fetch inviter name separately
  let inviterName = 'Someone'
  if (invite?.invited_by && invite?.org_id) {
    const { data: inviterProfile } = await admin
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', invite.invited_by)
      .eq('org_id', invite.org_id)
      .single()
    if (inviterProfile) {
      inviterName = [inviterProfile.first_name, inviterProfile.last_name].filter(Boolean).join(' ') || 'Someone'
    }
  }

  const org  = invite?.organisations as unknown as { name: string; slug: string } | null
  const role = invite?.roles as unknown as { label: string } | null

  // Determine state
  const isNotFound = !invite
  const isExpired  = invite && !invite.accepted_at && new Date(invite.expires_at) < new Date()
  const isAccepted = invite?.accepted_at != null

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient blobs */}
      <div aria-hidden style={{
        position: 'absolute', top: -200, left: -160,
        width: 560, height: 560, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #1e1b4b, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.9, pointerEvents: 'none',
      }} />
      <div aria-hidden style={{
        position: 'absolute', bottom: -220, right: -180,
        width: 640, height: 640, borderRadius: '50%',
        background: 'radial-gradient(closest-side, #0c4a6e, transparent 70%)',
        filter: 'blur(80px)', opacity: 0.9, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, position: 'relative', flexShrink: 0,
            background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
            boxShadow: '0 6px 20px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.2)',
          }}>
            <div style={{ position: 'absolute', inset: 7, borderRadius: 4, background: 'var(--bg)' }} />
          </div>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>LetroFlow</span>
        </div>

        {/* Error states */}
        {(isNotFound || isExpired || isAccepted) && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5)',
            padding: '32px 28px', textAlign: 'center',
          }}>
            {isNotFound && (
              <>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Invalid invitation</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
                  This invitation link is invalid or has been cancelled.
                </p>
              </>
            )}
            {isExpired && (
              <>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Invitation expired</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
                  This invitation expired on{' '}
                  {new Date(invite!.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Ask the owner to send a new one.
                </p>
              </>
            )}
            {isAccepted && (
              <>
                <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>Already accepted</p>
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 20px', lineHeight: 1.55 }}>
                  This invitation has already been used. Sign in to access {org?.name ?? 'your organisation'}.
                </p>
                <a
                  href="/login"
                  style={{
                    display: 'inline-block', padding: '9px 20px', borderRadius: 9,
                    background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                    boxShadow: '0 4px 16px var(--glow-i)',
                    color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none',
                  }}
                >
                  Sign in
                </a>
              </>
            )}
          </div>
        )}

        {/* Valid invite — client component handles auth state */}
        {!isNotFound && !isExpired && !isAccepted && (
          <InviteAcceptCard
            token={token}
            orgName={org?.name ?? ''}
            roleLabel={role?.label ?? ''}
            inviterName={inviterName}
            email={invite.email}
            expiresAt={invite.expires_at}
          />
        )}
      </div>
    </div>
  )
}
