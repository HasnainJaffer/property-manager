'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { IconEye, IconEyeOff } from '@tabler/icons-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/dashboard'
  const errorParam = searchParams.get('error')

  const [showPassword, setShowPassword] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, position: 'relative', flexShrink: 0,
          background: 'conic-gradient(from 140deg, var(--indigo), var(--cyan), var(--mint), var(--indigo))',
          boxShadow: '0 6px 20px var(--glow-i), inset 0 0 0 1px rgba(255,255,255,.2)',
        }}>
          <div style={{
            position: 'absolute', inset: 7, borderRadius: 4,
            background: 'var(--bg)',
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)',
          }} />
        </div>
        <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>
          PropFlow
        </span>
      </div>

      {/* Card */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 40px -8px rgba(0,0,0,0.5)',
        padding: '28px 28px 24px',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          Sign in
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 22px' }}>
          Welcome back to your portfolio
        </p>

        <form method="POST" action="/api/auth/login" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Pass the ?next redirect through the form */}
          <input type="hidden" name="next" value={next} />

          {/* Email */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              required
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
                name="password"
                required
                placeholder="••••••••"
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

          {/* Error from query param (set by server on failed login) */}
          {errorParam && (
            <p style={{
              fontSize: 11.5, color: 'var(--rose)', margin: 0,
              padding: '8px 12px', borderRadius: 8,
              background: 'rgba(251,113,133,0.08)',
              border: '1px solid rgba(251,113,133,0.2)',
            }}>
              {errorParam}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            style={{
              marginTop: 4,
              width: '100%', padding: '9px 0',
              borderRadius: 9, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
              boxShadow: '0 4px 16px var(--glow-i)',
              color: '#fff', fontSize: 13.5, fontWeight: 500,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            Sign in
          </button>
        </form>
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', fontSize: 12.5, color: 'var(--text-mute)', marginTop: 18 }}>
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          style={{ color: 'var(--text-dim)', fontWeight: 500, textDecoration: 'none', transition: 'color .15s' }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-dim)')}
        >
          Sign up
        </Link>
      </p>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
