'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconX, IconTrash } from '@tabler/icons-react'
import AppShell from '@/components/layout/AppShell'
import PageWrapper from '@/components/layout/PageWrapper'
import { useOrgData, type MemberRow, type InviteRow, type RoleOption } from '@/lib/org-data-context'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  const [y, m, day] = d.slice(0, 10).split('-')
  return `${day}/${m}/${y}`
}

function initials(first: string | null, last: string | null) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}` || '?'
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date()
}

// ─── Animations ───────────────────────────────────────────────────────────────

const stagger = { visible: { transition: { staggerChildren: 0.04 } } }
const row     = { hidden: { opacity: 0, y: 3 }, visible: { opacity: 1, y: 0, transition: { duration: 0.15 } } }

// ─── Badge components ─────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: { name: string; label: string } | null }) {
  if (!role) return <span className="crystal-pill void" style={{ fontSize: 10 }}>Unknown</span>

  if (role.name === 'owner')
    return <span className="crystal-pill" style={{ fontSize: 10, color: 'var(--indigo)', borderColor: 'rgba(129,140,248,.3)', background: 'rgba(129,140,248,.1)' }}>{role.label}</span>
  if (role.name === 'manager')
    return <span className="crystal-pill" style={{ fontSize: 10, color: 'var(--cyan)', borderColor: 'rgba(34,211,238,.3)', background: 'rgba(34,211,238,.08)' }}>{role.label}</span>
  if (role.name === 'accountant')
    return <span className="crystal-pill" style={{ fontSize: 10, color: 'var(--mint)', borderColor: 'rgba(52,211,153,.3)', background: 'rgba(52,211,153,.08)' }}>{role.label}</span>
  if (role.name === 'maintenance')
    return <span className="crystal-pill warn" style={{ fontSize: 10 }}>{role.label}</span>

  return <span className="crystal-pill void" style={{ fontSize: 10 }}>{role.label}</span>
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive
    ? <span className="crystal-pill healthy dot" style={{ fontSize: 10 }}>Active</span>
    : <span className="crystal-pill void" style={{ fontSize: 10 }}>Inactive</span>
}

function InviteStatusBadge({ invite }: { invite: InviteRow }) {
  if (invite.accepted_at)  return <span className="crystal-pill healthy" style={{ fontSize: 10 }}>Accepted</span>
  if (isExpired(invite.expires_at)) return <span className="crystal-pill arrears" style={{ fontSize: 10 }}>Expired</span>
  return <span className="crystal-pill warn dot" style={{ fontSize: 10 }}>Pending</span>
}

// ─── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <h2 style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-mute)', margin: 0 }}>
        {children}
      </h2>
      {count !== undefined && count > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 5,
          background: 'var(--surface-2)', border: '1px solid var(--border)',
          color: 'var(--text-mute)',
        }}>
          {count}
        </span>
      )}
    </div>
  )
}

// ─── Invite Member Modal ──────────────────────────────────────────────────────

function InviteMemberModal({
  orgId,
  roles,
  onClose,
  onInvited,
}: {
  orgId: string
  roles: RoleOption[]
  onClose: () => void
  onInvited: () => void
}) {
  const invitableRoles = roles.filter(r => !['owner'].includes(r.name))
  const [email, setEmail]     = useState('')
  const [roleId, setRoleId]   = useState(invitableRoles[0]?.id ?? '')
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, roleId, orgId }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Failed to send invite.')
      setLoading(false)
      return
    }
    onInvited()
  }

  return (
    <div className="crystal-modal-overlay" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'absolute', inset: 0 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="crystal-modal"
        style={{ position: 'relative', width: '100%', maxWidth: 420 }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Invite team member</h2>
          <button onClick={onClose} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <IconX size={14} strokeWidth={2} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
              Email address <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="crystal-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: 'var(--text-dim)', marginBottom: 6 }}>
              Role <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="crystal-select">
              {invitableRoles.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>

          <p style={{ fontSize: 11.5, color: 'var(--text-mute)', margin: 0, lineHeight: 1.55 }}>
            They&apos;ll receive an invite link valid for 7 days. They&apos;ll need to create an account or sign in to accept it.
          </p>

          {error && (
            <p style={{ fontSize: 11.5, color: 'var(--rose)', padding: '8px 12px', borderRadius: 8, background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)', margin: 0 }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', background: 'linear-gradient(180deg, var(--indigo), var(--indigo-2))', boxShadow: '0 4px 14px var(--glow-i)', color: '#fff', fontSize: 13, fontWeight: 500, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}
            >
              {loading ? 'Sending…' : 'Send invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

// ─── Shared table card style ──────────────────────────────────────────────────

const tableCard: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  overflow: 'hidden',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.06) inset, 0 8px 24px -8px rgba(0,0,0,0.28)',
}

const thStyle: React.CSSProperties = {
  padding: '0 14px 10px',
  fontSize: 10,
  fontWeight: 500,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--text-mute)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdBase: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: 12,
  borderBottom: '1px solid var(--border)',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const { orgId, members, invitations: invites, roles, loading, refreshTeam, cancelInvite } = useOrgData()
  const [showModal, setShowModal] = useState(false)

  const handleCancelInvite = cancelInvite

  const activeCount  = members.filter(m => m.is_active).length
  const pendingCount = invites.filter(i => !i.accepted_at && !isExpired(i.expires_at)).length
  const subtitle     = loading
    ? 'Loading…'
    : `${members.length} member${members.length !== 1 ? 's' : ''} · ${activeCount} active${pendingCount > 0 ? ` · ${pendingCount} pending invite${pendingCount !== 1 ? 's' : ''}` : ''}`

  return (
    <>
      <AppShell title="Team" subtitle={subtitle} action={{ label: 'Invite Member', onClick: () => setShowModal(true) }}>
        <PageWrapper>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <p style={{ fontSize: 12, color: 'var(--text-mute)' }}>Loading team…</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* ── Members table ──────────────────────────────────────── */}
              <div>
                <SectionHeading count={members.length}>Members</SectionHeading>
                {members.length === 0 ? (
                  <div style={{ ...tableCard, padding: '32px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-mute)', margin: 0 }}>No members yet.</p>
                  </div>
                ) : (
                  <div style={tableCard}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={thStyle}>Name</th>
                          <th style={thStyle}>Role</th>
                          <th style={thStyle}>Joined</th>
                          <th style={thStyle}>Status</th>
                        </tr>
                      </thead>
                      <motion.tbody variants={stagger} initial="hidden" animate="visible">
                        {members.map((m, i) => (
                          <motion.tr
                            key={m.id}
                            variants={row}
                            className="crystal-table-row"
                            style={{ borderBottom: i < members.length - 1 ? '1px solid var(--border)' : 'none' }}
                          >
                            {/* Avatar + name */}
                            <td style={tdBase}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                  background: 'linear-gradient(135deg, var(--indigo), var(--cyan))',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  boxShadow: '0 2px 8px var(--glow-i)',
                                }}>
                                  <span style={{ fontSize: 10.5, fontWeight: 600, color: '#fff' }}>
                                    {initials(m.first_name, m.last_name)}
                                  </span>
                                </div>
                                <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                                  {[m.first_name, m.last_name].filter(Boolean).join(' ') || '—'}
                                </span>
                              </div>
                            </td>
                            <td style={tdBase}><RoleBadge role={m.roles} /></td>
                            <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                              {fmtDate(m.created_at)}
                            </td>
                            <td style={tdBase}><StatusBadge isActive={m.is_active} /></td>
                          </motion.tr>
                        ))}
                      </motion.tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ── Invitations table ──────────────────────────────────── */}
              <div>
                <SectionHeading count={invites.length}>Invitations</SectionHeading>
                {invites.length === 0 ? (
                  <div style={{ ...tableCard, padding: '32px 0', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-mute)', margin: 0 }}>No invitations sent yet.</p>
                  </div>
                ) : (
                  <div style={tableCard}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={thStyle}>Email</th>
                          <th style={thStyle}>Role</th>
                          <th style={thStyle}>Sent</th>
                          <th style={thStyle}>Expires</th>
                          <th style={thStyle}>Status</th>
                          <th style={thStyle}></th>
                        </tr>
                      </thead>
                      <motion.tbody variants={stagger} initial="hidden" animate="visible">
                        {invites.map((inv, i) => {
                          const expired = isExpired(inv.expires_at)
                          return (
                            <motion.tr
                              key={inv.id}
                              variants={row}
                              className="crystal-table-row"
                              style={{ borderBottom: i < invites.length - 1 ? '1px solid var(--border)' : 'none' }}
                            >
                              <td style={{ ...tdBase, color: 'var(--text)', fontWeight: 500 }}>{inv.email}</td>
                              <td style={tdBase}><RoleBadge role={inv.roles} /></td>
                              <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                                {fmtDate(inv.created_at)}
                              </td>
                              <td style={{ ...tdBase, fontFamily: 'var(--font-mono)', fontSize: 11, whiteSpace: 'nowrap', color: expired ? 'var(--rose)' : 'var(--text-dim)' }}>
                                {fmtDate(inv.expires_at)}
                              </td>
                              <td style={tdBase}><InviteStatusBadge invite={inv} /></td>
                              <td style={{ ...tdBase, textAlign: 'right' }}>
                                {!inv.accepted_at && (
                                  <button
                                    onClick={() => handleCancelInvite(inv.id)}
                                    title="Cancel invitation"
                                    style={{
                                      width: 26, height: 26, borderRadius: 6,
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      border: '1px solid var(--border)', background: 'transparent',
                                      color: 'var(--text-mute)', cursor: 'pointer', transition: 'color .15s, border-color .15s',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.borderColor = 'rgba(251,113,133,0.4)' }}
                                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-mute)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                                  >
                                    <IconTrash size={12} strokeWidth={1.75} />
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </motion.tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

        </PageWrapper>
      </AppShell>

      <AnimatePresence>
        {showModal && orgId && (
          <InviteMemberModal
            orgId={orgId}
            roles={roles}
            onClose={() => setShowModal(false)}
            onInvited={() => { setShowModal(false); refreshTeam() }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
