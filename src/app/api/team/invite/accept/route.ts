import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  // Require authenticated user
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'You must be signed in to accept an invitation.' }, { status: 401 })

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

  // Check user isn't already a member of this org
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', invite.org_id)
    .single()

  if (existing) {
    // Already a member — just mark accepted and redirect
    await admin.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)
    const orgSlug = (invite.organisations as unknown as { slug: string } | null)?.slug
    return NextResponse.json({ orgSlug })
  }

  // Get name from auth metadata
  const { data: { user: fullUser } } = await admin.auth.admin.getUserById(user.id)
  const firstName = fullUser?.user_metadata?.first_name ?? ''
  const lastName  = fullUser?.user_metadata?.last_name  ?? ''

  // Create the profile
  const { error: profileError } = await admin
    .from('profiles')
    .insert({
      user_id:    user.id,
      org_id:     invite.org_id,
      role_id:    invite.role_id,
      first_name: firstName,
      last_name:  lastName,
    })

  if (profileError) {
    console.error('Profile insert error:', profileError)
    return NextResponse.json({ error: 'Failed to create your profile. Please try again.' }, { status: 500 })
  }

  // Mark invitation accepted
  await admin
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  const orgSlug = (invite.organisations as unknown as { slug: string } | null)?.slug
  return NextResponse.json({ orgSlug })
}
