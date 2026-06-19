'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { IconCheck } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { useOrgData } from '@/lib/org-data-context'
import CrystalSelect, { type SelectOption } from '@/components/ui/CrystalSelect'
import { createClient } from '@/lib/supabase/client'

// ─── Plan config ──────────────────────────────────────────────────────────────

const PLAN_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
  border: string
  description: string
}> = {
  free: {
    label: 'Free',
    color: 'var(--text-mute)',
    bg: 'var(--surface-2)',
    border: 'var(--border)',
    description: 'Up to 3 properties. Perfect for getting started.',
  },
  starter: {
    label: 'Starter',
    color: 'var(--indigo)',
    bg: 'rgba(129,140,248,.1)',
    border: 'rgba(129,140,248,.3)',
    description: 'Up to 10 properties with full feature access.',
  },
  pro: {
    label: 'Pro',
    color: 'var(--cyan)',
    bg: 'rgba(34,211,238,.08)',
    border: 'rgba(34,211,238,.3)',
    description: 'Unlimited properties, advanced reporting, and priority support.',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'var(--amber)',
    bg: 'rgba(251,191,36,.08)',
    border: 'rgba(251,191,36,.3)',
    description: 'Custom limits, dedicated account manager, and SLA guarantee.',
  },
}

const PRO_FEATURES = [
  'Unlimited properties',
  'Advanced financial reporting',
  'Document storage',
  'Audit log',
  'Priority support',
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { orgId } = useOrgData()

  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [typeId,    setTypeId]    = useState('')
  const [plan,      setPlan]      = useState('free')
  const [orgTypes,  setOrgTypes]  = useState<SelectOption[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!orgId) return
    const run = async () => {
      const sb = createClient()
      const [{ data: org }, { data: types }] = await Promise.all([
        sb.from('organisations')
          .select('name, email, organisation_type_id, plan')
          .eq('id', orgId)
          .single(),
        sb.from('organisation_types')
          .select('id, label')
          .eq('is_active', true)
          .order('sort_order'),
      ])
      if (org) {
        setName(org.name ?? '')
        setEmail(org.email ?? '')
        setTypeId(org.organisation_type_id ?? '')
        setPlan(org.plan ?? 'free')
      }
      setOrgTypes((types ?? []).map(t => ({ value: t.id, label: t.label })))
      setLoading(false)
    }
    run()
  }, [orgId])

  const handleSave = useCallback(async () => {
    if (!orgId || saving) return
    setSaving(true)
    setSaved(false)
    setSaveError('')
    const { error } = await createClient()
      .from('organisations')
      .update({
        name: name.trim(),
        email: email.trim() || null,
        organisation_type_id: typeId,
      })
      .eq('id', orgId)
    setSaving(false)
    if (error) {
      setSaveError('Failed to save. Please try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }, [orgId, name, email, typeId, saving])

  const planConfig = PLAN_CONFIG[plan] ?? PLAN_CONFIG.free
  const isOnPro    = plan === 'pro' || plan === 'enterprise'

  const cardStyle: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.3)',
    padding: 28,
  }

  return (
    <AppShell
      title="Settings"
      subtitle="Manage your organisation details and subscription"
      action={{ label: saving ? 'Saving…' : 'Save Changes', onClick: handleSave }}
    >
      <PageWrapper>
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Organisation details ──────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            style={cardStyle}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
              Organisation Details
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-mute)', margin: '0 0 24px' }}>
              Update your organisation's name, portfolio type, and contact email.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Organisation Name
                </label>
                <input
                  className="crystal-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Syster Properties Ltd"
                  disabled={loading}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Portfolio Type
                </label>
                <CrystalSelect
                  value={typeId}
                  onChange={setTypeId}
                  options={orgTypes}
                  placeholder="Select type…"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
                  Contact Email
                </label>
                <input
                  className="crystal-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. hello@yourcompany.com"
                  disabled={loading}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            {/* Footer: feedback + save */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, minHeight: 20 }}>
                {saved     && <span style={{ color: 'var(--mint)' }}>Changes saved successfully.</span>}
                {saveError && <span style={{ color: 'var(--rose)' }}>{saveError}</span>}
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                  boxShadow: '0 4px 16px var(--glow-i)',
                  color: '#fff', border: 'none',
                  cursor: saving || loading ? 'not-allowed' : 'pointer',
                  opacity: saving || loading ? 0.6 : 1,
                  transition: 'opacity .15s',
                }}
                onMouseEnter={e => { if (!saving && !loading) e.currentTarget.style.opacity = '0.85' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = saving || loading ? '0.6' : '1' }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </motion.div>

          {/* ── Subscription ─────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: 0.07 }}
            style={cardStyle}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>
              Subscription
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-mute)', margin: '0 0 20px' }}>
              Your current plan and billing details.
            </p>

            {/* Current plan pill */}
            <div style={{
              padding: '16px 18px', borderRadius: 12,
              background: planConfig.bg,
              border: `1px solid ${planConfig.border}`,
              marginBottom: 20,
            }}>
              <p style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-mute)', margin: '0 0 6px' }}>
                Current plan
              </p>
              <p style={{ fontSize: 18, fontWeight: 700, color: planConfig.color, margin: '0 0 4px' }}>
                {planConfig.label}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
                {planConfig.description}
              </p>
            </div>

            {/* Pro features teaser */}
            {!isOnPro && (
              <>
                <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-mute)', margin: '0 0 10px' }}>
                  Unlock with Pro
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {PRO_FEATURES.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <IconCheck size={13} strokeWidth={2.5} style={{ color: 'var(--mint)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  disabled
                  style={{
                    padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                    background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))',
                    boxShadow: '0 4px 16px var(--glow-i)',
                    color: '#fff', border: 'none', cursor: 'not-allowed', opacity: 0.5,
                  }}
                >
                  Upgrade to Pro — coming soon
                </button>
              </>
            )}
          </motion.div>

        </div>
      </PageWrapper>
    </AppShell>
  )
}
