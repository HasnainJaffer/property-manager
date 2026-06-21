'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

interface OrgType {
  id: string | null
  name: string
  label: string
}

const FALLBACK_TYPES: OrgType[] = [
  { id: null, name: 'buy_to_let',             label: 'Buy to Let' },
  { id: null, name: 'hmo',                    label: 'HMO' },
  { id: null, name: 'serviced_accommodation', label: 'Serviced Accommodation' },
  { id: null, name: 'holiday_let',            label: 'Holiday Let' },
  { id: null, name: 'commercial',             label: 'Commercial' },
  { id: null, name: 'mixed_portfolio',        label: 'Mixed Portfolio' },
]

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
  const suffix = Math.random().toString(36).substring(2, 6)
  return `${base}-${suffix}`
}

export default function OnboardingPage() {
  const [orgName, setOrgName]         = useState('')
  const [orgTypes, setOrgTypes]       = useState<OrgType[]>(FALLBACK_TYPES)
  const [selectedType, setSelectedType] = useState<OrgType>(FALLBACK_TYPES[0])
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/login')
    })

    supabase
      .from('organisation_types')
      .select('id, name, label')
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) { console.error('organisation_types query error:', error); return }
        if (data && data.length > 0) {
          setOrgTypes(data)
          setSelectedType(data[0])
        }
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    let typeId = selectedType.id
    if (!typeId) {
      const { data: typeRow, error: typeErr } = await supabase
        .from('organisation_types')
        .select('id')
        .eq('name', selectedType.name)
        .single()
      if (typeErr || !typeRow) {
        setError(`Could not resolve organisation type. DB error: ${typeErr?.message ?? 'no row found'}`)
        setLoading(false)
        return
      }
      typeId = typeRow.id
    }

    const { data: ownerRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'owner')
      .single()
    if (roleError || !ownerRole) {
      setError(`Could not load owner role. DB error: ${roleError?.message ?? 'no row found'}`)
      setLoading(false)
      return
    }

    const orgId = crypto.randomUUID()
    const slug  = generateSlug(orgName)

    const { error: orgError } = await supabase
      .from('organisations')
      .insert({ id: orgId, name: orgName, slug, organisation_type_id: typeId })
    if (orgError) { setError(orgError.message); setLoading(false); return }

    const firstName = user.user_metadata?.first_name ?? ''
    const lastName  = user.user_metadata?.last_name  ?? ''

    const { error: profileError } = await supabase
      .from('profiles')
      .insert({ user_id: user.id, org_id: orgId, role_id: ownerRole.id, first_name: firstName, last_name: lastName })
    if (profileError) { setError(profileError.message); setLoading(false); return }

    router.push(`/${slug}/dashboard`)
    router.refresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
    >
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
        {['Account', 'Organisation'].map((label, i) => {
          const done = i === 0
          const active = i === 1
          return (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 600,
                  background: done
                    ? 'rgba(52,211,153,0.15)'
                    : active
                      ? 'linear-gradient(135deg, var(--indigo), var(--indigo-2))'
                      : 'var(--surface-2)',
                  border: done
                    ? '1px solid rgba(52,211,153,0.3)'
                    : active
                      ? 'none'
                      : '1px solid var(--border)',
                  color: done ? 'var(--mint)' : active ? '#fff' : 'var(--text-mute)',
                  boxShadow: active ? '0 2px 8px var(--glow-i)' : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{
                  fontSize: 11.5, fontWeight: active ? 500 : 400,
                  color: active ? 'var(--text)' : done ? 'var(--text-dim)' : 'var(--text-mute)',
                }}>
                  {label}
                </span>
              </div>
              {i < 1 && (
                <div style={{ width: 24, height: 1, background: 'var(--border-2)', margin: '0 2px' }} />
              )}
            </div>
          )
        })}
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/letroflow-lockup-dark.svg" alt="LetroFlow" height={38} style={{ display: 'block' }} />
        </div>
        <h1 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
          Create your organisation
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 22px', lineHeight: 1.5 }}>
          This is your portfolio — you can rename it or add more organisations later.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Org name */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
              Organisation name
            </label>
            <input
              type="text"
              required
              value={orgName}
              onChange={e => setOrgName(e.target.value)}
              placeholder="e.g. Smith Properties Ltd"
              className="crystal-input"
            />
          </div>

          {/* Portfolio type */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 10 }}>
              Portfolio type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {orgTypes.map(type => {
                const active = selectedType.name === type.name
                return (
                  <button
                    key={type.name}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 9,
                      border: active ? '1px solid var(--indigo)' : '1px solid var(--border)',
                      background: active
                        ? 'rgba(99,102,241,0.12)'
                        : 'var(--surface-2)',
                      color: active ? 'var(--indigo)' : 'var(--text-dim)',
                      fontSize: 12.5,
                      fontWeight: active ? 500 : 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color .15s, background .15s, color .15s',
                      boxShadow: active ? '0 0 0 3px rgba(99,102,241,0.1)' : 'none',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = 'var(--border-2)'
                        e.currentTarget.style.color = 'var(--text)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.borderColor = 'var(--border)'
                        e.currentTarget.style.color = 'var(--text-dim)'
                      }
                    }}
                  >
                    {type.label}
                  </button>
                )
              })}
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
            disabled={loading || !orgName.trim()}
            style={{
              width: '100%', padding: '9px 0',
              borderRadius: 9, border: 'none',
              cursor: loading || !orgName.trim() ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
              boxShadow: '0 4px 16px var(--glow-i)',
              color: '#fff', fontSize: 13.5, fontWeight: 500,
              opacity: loading || !orgName.trim() ? 0.5 : 1,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => { if (!loading && orgName.trim()) e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { if (!loading && orgName.trim()) e.currentTarget.style.opacity = '1' }}
          >
            {loading ? 'Creating…' : 'Create organisation'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}
