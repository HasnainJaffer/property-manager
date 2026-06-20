'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheck, IconAlertTriangle, IconX } from '@tabler/icons-react'
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

// ─── Delete Account Modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ isOwner, orgName, onClose }: {
  isOwner: boolean
  orgName: string
  onClose: () => void
}) {
  const router = useRouter()
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    if (confirm !== 'DELETE') return
    setDeleting(true)
    setError(null)

    const res = await fetch('/api/account/delete', { method: 'POST' })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong. Please try again.')
      setDeleting(false)
      return
    }

    // Sign out locally (session cookie is now invalid server-side)
    await createClient().auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        className="crystal-modal-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="crystal-modal"
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.16 }}
        style={{ position: 'relative', width: '100%', maxWidth: 440 }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid rgba(251,113,133,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(251,113,133,0.12)', border: '1px solid rgba(251,113,133,0.25)',
            }}>
              <IconAlertTriangle size={15} strokeWidth={1.75} style={{ color: 'var(--rose)' }} />
            </div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
              Delete account
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text-mute)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.background = 'transparent' }}
          >
            <IconX size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Warning box */}
          <div style={{
            padding: '12px 14px', borderRadius: 10,
            background: 'rgba(251,113,133,0.06)', border: '1px solid rgba(251,113,133,0.2)',
            fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.6,
          }}>
            {isOwner ? (
              <>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--rose)' }}>
                  This will permanently delete your organisation.
                </p>
                <p style={{ margin: 0 }}>
                  Deleting your account will permanently remove <strong style={{ color: 'var(--text)' }}>{orgName}</strong> and
                  all its data — properties, tenancies, tenants, rent records, compliance certificates,
                  maintenance issues, and more. Team members who only belong to this organisation
                  will also have their accounts removed. <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--rose)' }}>
                  This will permanently delete your account.
                </p>
                <p style={{ margin: 0 }}>
                  Your account and all associated data will be deleted. You will be removed from
                  any organisations you belong to. <strong style={{ color: 'var(--text)' }}>This cannot be undone.</strong>
                </p>
              </>
            )}
          </div>

          {/* Confirm input */}
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
              Type <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--rose)', letterSpacing: '0.05em' }}>DELETE</span> to confirm
            </label>
            <input
              className="crystal-input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)', color: 'var(--rose)', margin: 0 }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: 13, background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)', cursor: 'pointer', transition: 'color .15s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirm !== 'DELETE' || deleting}
              style={{
                padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: confirm === 'DELETE' && !deleting ? 'rgba(251,113,133,0.15)' : 'rgba(251,113,133,0.06)',
                border: `1px solid ${confirm === 'DELETE' && !deleting ? 'rgba(251,113,133,0.5)' : 'rgba(251,113,133,0.2)'}`,
                color: confirm === 'DELETE' && !deleting ? 'var(--rose)' : 'rgba(251,113,133,0.4)',
                cursor: confirm === 'DELETE' && !deleting ? 'pointer' : 'not-allowed',
                transition: 'all .15s',
              }}
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { orgId, orgName, currentUser } = useOrgData()

  const [name,            setName]            = useState('')
  const [email,           setEmail]           = useState('')
  const [typeId,          setTypeId]          = useState('')
  const [plan,            setPlan]            = useState('free')
  const [orgTypes,        setOrgTypes]        = useState<SelectOption[]>([])
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [saved,           setSaved]           = useState(false)
  const [saveError,       setSaveError]       = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const isOwner = currentUser?.role === 'owner'

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

          {/* ── Subscription ──────────────────────────────────────────── */}
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

          {/* ── Danger Zone ─────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, delay: 0.14 }}
            style={{
              ...cardStyle,
              border: '1px solid rgba(251,113,133,0.18)',
            }}
          >
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--rose)', margin: '0 0 4px' }}>
              Danger Zone
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-mute)', margin: '0 0 20px', lineHeight: 1.55 }}>
              {isOwner
                ? `Permanently delete your account and the ${orgName} organisation, including all properties, tenancies, tenants, compliance records, and team members.`
                : 'Permanently delete your account and remove yourself from all organisations you belong to.'}
            </p>

            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              style={{
                padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.25)',
                color: 'var(--rose)', cursor: 'pointer', transition: 'background .15s, border-color .15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.14)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.45)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.08)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.25)' }}
            >
              Delete account
            </button>
          </motion.div>

        </div>
      </PageWrapper>

      <AnimatePresence>
        {showDeleteModal && (
          <DeleteAccountModal
            isOwner={isOwner}
            orgName={orgName}
            onClose={() => setShowDeleteModal(false)}
          />
        )}
      </AnimatePresence>

    </AppShell>
  )
}
