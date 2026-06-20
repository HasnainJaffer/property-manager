import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, firstName, lastName, password } = body as {
    token: string
    firstName?: string
    lastName?: string
    password?: string
  }

  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const admin = createAdminClient()

  // Validate the invitation
  const { data: invite, error: inviteError } = await admin
    .from('invitations')
    .select('id, org_id, role_id, email, expires_at, accepted_at, organisations ( slug )')
    .eq('token', token)
    .single()

  if (inviteError || !invite) {
    return NextResponse.json({ error: 'Invitation not found or has been cancelled.' }, { status: 404 })
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: 'This invitation has already been accepted.' }, { status: 409 })
  }
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invitation has expired.' }, { status: 410 })
  }

  const orgSlug = (invite.organisations as unknown as { slug: string } | null)?.slug

  // ── NEW USER FLOW: password provided — create auth account server-side ──
  if (password) {
    const fName = (firstName ?? '').trim()
    const lName = (lastName ?? '').trim()

    if (!fName) return NextResponse.json({ error: 'First name is required.' }, { status: 400 })

    // Create the auth user and skip email confirmation
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { first_name: fName, last_name: lName },
    })

    if (createError) {
      const msg = createError.message.toLowerCase().includes('already')
        ? 'An account with this email already exists. Please sign in instead.'
        : createError.message
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const userId = created.user.id

    // Create profile
    const { error: profileError } = await admin.from('profiles').insert({
      user_id:    userId,
      org_id:     invite.org_id,
      role_id:    invite.role_id,
      first_name: fName,
      last_name:  lName,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(userId)
      console.error('Profile insert error (new user):', profileError)
      return NextResponse.json({ error: 'Failed to create your profile. Please try again.' }, { status: 500 })
    }

    await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

    return NextResponse.json({ orgSlug })
  }

  // ── EXISTING USER FLOW: already signed in ──
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in to accept this invitation.' }, { status: 401 })

  // If already a member, just mark accepted and redirect
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', invite.org_id)
    .single()

  if (existing) {
    await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
    return NextResponse.json({ orgSlug })
  }

  // Get name from auth metadata
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  const fName = fullUser?.user_metadata?.first_name ?? ''
  const lName = fullUser?.user_metadata?.last_name  ?? ''

  const { error: profileError } = await admin.from('profiles').insert({
    user_id:    user.id,
    org_id:     invite.org_id,
    role_id:    invite.role_id,
    first_name: fName,
    last_name:  lName,
  })

  if (profileError) {
    console.error('Profile insert error (existing user):', profileError)
    return NextResponse.json({ error: 'Failed to create your profile. Please try again.' }, { status: 500 })
  }

  await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({ orgSlug })
}
