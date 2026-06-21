'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signup' | 'signin'

interface Props {
  token: string
  orgName: string
  roleLabel: string
  inviterName: string
  email: string
  expiresAt: string
}

export default function InviteAcceptCard({ token, orgName, roleLabel, inviterName, email, expiresAt }: Props) {
  const router = useRouter()
  const [mode, setMode]       = useState<Mode>('signup')
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const expiryDisplay = new Date(expiresAt).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  function switchMode(m: Mode) { setMode(m); setError(null); setPassword(''); setConfirm('') }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm)    { setError('Passwords do not match.'); return }
    if (password.length < 8)     { setError('Password must be at least 8 characters.'); return }
    if (!firstName.trim())       { setError('First name is required.'); return }
    setLoading(true); setError(null)

    // Server creates the auth user (skips email confirmation) + profile + marks accepted
    const res = await fetch('/api/team/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName: firstName.trim(), lastName: lastName.trim(), password }),
    })
    const data = await res.json()
    if (!res.ok) {
      // If account already exists, nudge them to sign in
      if (data.error?.toLowerCase().includes('already')) {
        setError(data.error)
        setLoading(false)
        return
      }
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    // Sign in with newly created credentials
    const { error: signInErr } = await createClient().auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError('Account created but sign-in failed. Please use the sign-in form.')
      switchMode('signin')
      setLoading(false)
      return
    }

    router.push(`/${data.orgSlug}/dashboard`)
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)

    const { error: signInErr } = await createClient().auth.signInWithPassword({ email, password })
    if (signInErr) {
      setError('Incorrect password. Please try again.')
      setLoading(false)
      return
    }

    // Accept the invite now that we're authenticated
    const res = await fetch('/api/team/invite/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      setLoading(false)
      return
    }

    router.push(`/${data.orgSlug}/dashboard`)
  }

  const label: React.CSSProperties = {
    fontSize: 11.5, fontWeight: 500, color: 'var(--text-dim)', display: 'block', marginBottom: 5,
  }
  const btnPrimary: React.CSSProperties = {
    width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
    background: loading ? 'rgba(99,102,241,0.5)' : 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
    boxShadow: loading ? 'none' : '0 4px 16px var(--glow-i)',
    color: '#fff', fontSize: 13, fontWeight: 500,
    cursor: loading ? 'not-allowed' : 'pointer', marginTop: 4,
  }
  const switchBtn: React.CSSProperties = {
    background: 'none', border: 'none', color: 'var(--indigo)',
    cursor: 'pointer', fontSize: 12, padding: 0,
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5)',
        padding: '32px 28px',
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={38} style={{ display: 'block' }} />
      </div>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
          {mode === 'signup' ? 'Create your account' : 'Sign in to accept'}
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.55 }}>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{inviterName}</span> invited you to join{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{orgName}</span> as{' '}
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{roleLabel}</span>.
        </p>
      </div>

      {/* Pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, fontSize: 11, fontWeight: 500, color: 'var(--indigo)' }}>
          {orgName}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 10px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', borderRadius: 20, fontSize: 11, fontWeight: 500, color: 'var(--mint)' }}>
          {roleLabel}
        </span>
      </div>

      {/* Error */}
      {error && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 9, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', color: 'var(--rose)', fontSize: 12, lineHeight: 1.5 }}>
          {error}
        </div>
      )}

      {mode === 'signup' ? (
        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={label}>Email</label>
            <input className="crystal-input" value={email} readOnly style={{ opacity: 0.55, cursor: 'default' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <div>
              <label style={label}>First name <span style={{ color: 'var(--rose)' }}>*</span></label>
              <input required className="crystal-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
            </div>
            <div>
              <label style={label}>Last name</label>
              <input className="crystal-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Smith" />
            </div>
          </div>

          <div>
            <label style={label}>Password <span style={{ color: 'var(--rose)' }}>*</span></label>
            <input required type="password" className="crystal-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" autoComplete="new-password" />
          </div>

          <div>
            <label style={label}>Confirm password <span style={{ color: 'var(--rose)' }}>*</span></label>
            <input required type="password" className="crystal-input" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
          </div>

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Creating account…' : 'Create account & accept'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-mute)', margin: 0 }}>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('signin')} style={switchBtn}>Sign in instead</button>
          </p>
        </form>
      ) : (
        <form onSubmit={handleSignin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={label}>Email</label>
            <input className="crystal-input" value={email} readOnly style={{ opacity: 0.55, cursor: 'default' }} />
          </div>

          <div>
            <label style={label}>Password <span style={{ color: 'var(--rose)' }}>*</span></label>
            <input required type="password" className="crystal-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Signing in…' : 'Sign in & accept'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-mute)', margin: 0 }}>
            New to LetroFlow?{' '}
            <button type="button" onClick={() => switchMode('signup')} style={switchBtn}>Create an account</button>
          </p>
        </form>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-mute)', margin: '20px 0 0', lineHeight: 1.55, textAlign: 'center' }}>
        Invitation sent to <span style={{ color: 'var(--text-dim)' }}>{email}</span>
        {' · '}expires {expiryDisplay}
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}
