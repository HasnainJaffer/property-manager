'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface Props {
  token: string
  orgName: string
  orgSlug: string
  roleLabel: string
  inviterName: string
  email: string
  expiresAt: string
}

export default function InviteAcceptCard({ token, orgName, orgSlug, roleLabel, inviterName, email, expiresAt }: Props) {
  const router = useRouter()
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading')
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      setAuthState(user ? 'authenticated' : 'unauthenticated')
    })
  }, [])

  const handleAccept = async () => {
    setAccepting(true)
    setError(null)
    try {
      const res = await fetch('/api/team/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        setAccepting(false)
        return
      }
      router.push(`/${data.orgSlug}/dashboard`)
    } catch {
      setError('Network error. Please try again.')
      setAccepting(false)
    }
  }

  const expiryDisplay = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5)',
    padding: '32px 28px',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={cardStyle}
    >
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          You've been invited
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{inviterName}</span> has invited you to join{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{orgName}</span> as{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{roleLabel}</span>.
        </p>
      </div>

      {/* Meta pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 20, fontSize: 11, fontWeight: 500, color: 'var(--indigo)',
        }}>
          {orgName}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
          background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
          borderRadius: 20, fontSize: 11, fontWeight: 500, color: 'var(--mint)',
        }}>
          {roleLabel}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 20, padding: '10px 14px', borderRadius: 9,
          background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)',
          color: 'var(--rose)', fontSize: 12, lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      {/* Actions */}
      {authState === 'loading' && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            border: '2px solid var(--border)', borderTopColor: 'var(--indigo)',
            animation: 'spin 0.7s linear infinite',
          }} />
        </div>
      )}

      {authState === 'authenticated' && (
        <button
          onClick={handleAccept}
          disabled={accepting}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
            background: accepting ? 'rgba(99,102,241,0.5)' : 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
            boxShadow: accepting ? 'none' : '0 4px 16px var(--glow-i)',
            color: '#fff', fontSize: 13, fontWeight: 500, cursor: accepting ? 'not-allowed' : 'pointer',
            transition: 'opacity 150ms ease',
          }}
        >
          {accepting ? 'Accepting…' : 'Accept invitation'}
        </button>
      )}

      {authState === 'unauthenticated' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <a
            href={`/login?next=/invite/${token}`}
            style={{
              display: 'block', width: '100%', padding: '11px 0', borderRadius: 10, textAlign: 'center',
              background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
              boxShadow: '0 4px 16px var(--glow-i)',
              color: '#fff', fontSize: 13, fontWeight: 500, textDecoration: 'none',
            }}
          >
            Sign in to accept
          </a>
          <a
            href={`/signup?next=/invite/${token}`}
            style={{
              display: 'block', width: '100%', padding: '10px 0', borderRadius: 10, textAlign: 'center',
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-dim)', fontSize: 13, fontWeight: 500, textDecoration: 'none',
              transition: 'border-color 150ms ease, color 150ms ease',
            }}
          >
            Create an account
          </a>
        </div>
      )}

      {/* Footer note */}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '20px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
        Invitation sent to <span style={{ color: 'var(--text-dim)' }}>{email}</span>
        {' · '}expires {expiryDisplay}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
