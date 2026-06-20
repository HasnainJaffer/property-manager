import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { randomBytes } from 'crypto'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { email, roleId, orgId } = await req.json()
  if (!email || !roleId || !orgId) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
  }

  // Authenticate the caller
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })

  // Verify caller is owner or manager of this org
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('roles ( name )')
    .eq('user_id', user.id)
    .eq('org_id', orgId)
    .single()

  const callerRole = (callerProfile?.roles as unknown as { name: string } | null)?.name
  if (!callerRole || !['owner', 'manager'].includes(callerRole)) {
    return NextResponse.json({ error: 'Only owners and managers can invite members.' }, { status: 403 })
  }

  const admin = createAdminClient()
  const token = randomBytes(32).toString('hex')

  // Insert the invitation
  const { error: insertError } = await admin
    .from('invitations')
    .insert({
      org_id: orgId,
      role_id: roleId,
      email: email.trim().toLowerCase(),
      invited_by: user.id,
      token,
    })

  if (insertError) {
    const msg = insertError.message.includes('unique')
      ? 'An invitation for this email address already exists.'
      : insertError.message
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Fetch org name, role label, and inviter name for the email
  const [{ data: org }, { data: role }, { data: inviterProfile }] = await Promise.all([
    admin.from('organisations').select('name').eq('id', orgId).single(),
    admin.from('roles').select('label').eq('id', roleId).single(),
    admin.from('profiles').select('first_name, last_name').eq('user_id', user.id).eq('org_id', orgId).single(),
  ])

  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const inviteUrl  = `${appUrl}/invite/${token}`
  const orgName    = org?.name ?? 'an organisation'
  const roleLabel  = role?.label ?? 'team member'
  const inviterName = [inviterProfile?.first_name, inviterProfile?.last_name].filter(Boolean).join(' ') || 'Someone'
  const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const { error: emailError } = await resend.emails.send({
    from: 'PropFlow <noreply@invites.letroflow.com>',
    to: email.trim().toLowerCase(),
    subject: `You've been invited to join ${orgName} on PropFlow`,
    html: buildInviteEmail({ orgName, roleLabel, inviterName, inviteUrl, expiry, email }),
  })

  if (emailError) {
    // Roll back the invitation so the UI stays consistent
    await admin.from('invitations').delete().eq('token', token)
    console.error('Resend error:', emailError)
    return NextResponse.json(
      { error: 'Invitation saved but email failed to send. Check your Resend domain configuration.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

function buildInviteEmail(p: {
  orgName: string
  roleLabel: string
  inviterName: string
  inviteUrl: string
  expiry: string
  email: string
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to PropFlow</title>
</head>
<body style="margin:0;padding:0;background:#07090f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07090f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Brand -->
          <tr>
            <td style="padding-bottom:28px;text-align:center;">
              <span style="display:inline-flex;align-items:center;gap:10px;font-size:18px;font-weight:600;color:#e7ecf3;letter-spacing:-0.01em;">
                PropFlow
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px;">

              <p style="margin:0 0 6px;font-size:20px;font-weight:600;color:#e7ecf3;letter-spacing:-0.01em;">
                You've been invited
              </p>
              <p style="margin:0 0 24px;font-size:14px;color:#98a2b3;line-height:1.6;">
                <strong style="color:#e7ecf3;">${p.inviterName}</strong> has invited you to join
                <strong style="color:#e7ecf3;">${p.orgName}</strong> on PropFlow as
                <strong style="color:#e7ecf3;">${p.roleLabel}</strong>.
              </p>

              <!-- Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background:linear-gradient(180deg,#818cf8,#6366f1);border-radius:9px;">
                    <a href="${p.inviteUrl}"
                       style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:500;color:#fff;text-decoration:none;border-radius:9px;">
                      Accept invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:12px;color:#66707d;line-height:1.6;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:11px;color:#818cf8;word-break:break-all;">
                ${p.inviteUrl}
              </p>

              <hr style="border:none;border-top:1px solid rgba(255,255,255,0.07);margin:0 0 20px;" />

              <p style="margin:0;font-size:12px;color:#66707d;line-height:1.6;">
                This invitation was sent to <strong style="color:#98a2b3;">${p.email}</strong>
                and expires on <strong style="color:#98a2b3;">${p.expiry}</strong>.
                If you weren't expecting this, you can safely ignore it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:20px;text-align:center;">
              <p style="margin:0;font-size:11px;color:#66707d;">
                PropFlow · Property management for UK landlords
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
