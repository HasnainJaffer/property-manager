'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { IconEye, IconEyeOff, IconMailCheck } from '@tabler/icons-react'
import { createClient } from '@/lib/supabase/client'

// ─── Shared sub-components ────────────────────────────────────────────────────

function BrandMark() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={38} style={{ display: 'block' }} />
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 16,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5)',
  padding: '28px 28px 24px',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SignupForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/onboarding'
  const router = useRouter()

  const [firstName, setFirstName]       = useState('')
  const [lastName, setLastName]         = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [emailSent, setEmailSent]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    if (data.session) {
      router.push(next)
      router.refresh()
      return
    }

    setEmailSent(true)
    setLoading(false)
  }

  return (
    <AnimatePresence mode="wait">
      {emailSent ? (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 28px' }}>
            <BrandMark />
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: '0 auto 16px',
              background: 'rgba(52,211,153,0.12)',
              border: '1px solid rgba(52,211,153,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <IconMailCheck size={22} strokeWidth={1.5} style={{ color: 'var(--mint)' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
              Check your email
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 4px', lineHeight: 1.55 }}>
              We sent a confirmation link to
            </p>
            <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', margin: '0 0 20px' }}>
              {email}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-mute)', lineHeight: 1.55 }}>
              Click the link in the email to continue setting up your account.
            </p>
          </div>
          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-mute)', marginTop: 18 }}>
            Wrong email?{' '}
            <button
              onClick={() => setEmailSent(false)}
              style={{ color: 'var(--text-dim)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', fontSize: 'inherit', transition: 'color .15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
            >
              Go back
            </button>
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          <div style={cardStyle}>
            <BrandMark />
            <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              Create your account
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 22px' }}>
              You&apos;ll set up your organisation on the next step
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Name row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                    First name
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="crystal-input"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                    Last name
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="crystal-input"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="crystal-input"
                />
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="crystal-input"
                    style={{ paddingRight: 38 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--text-mute)', background: 'transparent', border: 'none',
                      cursor: 'pointer', borderRadius: 4, transition: 'color .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-dim)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-mute)')}
                  >
                    {showPassword
                      ? <IconEyeOff size={14} strokeWidth={1.75} />
                      : <IconEye size={14} strokeWidth={1.75} />
                    }
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <p style={{
                  fontSize: 11.5, color: 'var(--rose)', margin: 0,
                  padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(251,113,133,0.08)',
                  border: '1px solid rgba(251,113,133,0.2)',
                }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  width: '100%', padding: '9px 0',
                  borderRadius: 9, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                  boxShadow: '0 4px 16px var(--glow-i)',
                  color: '#fff', fontSize: 13.5, fontWeight: 500,
                  opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1' }}
              >
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-mute)', marginTop: 18 }}>
            Already have an account?{' '}
            <Link
              href="/login"
              style={{ color: 'var(--text-dim)', fontWeight: 500, textDecoration: 'none', transition: 'color .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
            >
              Sign in
            </Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
