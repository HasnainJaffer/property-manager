import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 })

  const admin = createAdminClient()

  // Cascade-delete all owned org data, get back orphaned member IDs
  const { data: orphanedIds, error: cascadeError } = await admin
    .rpc('delete_account_cascade', { p_user_id: user.id })

  if (cascadeError) {
    console.error('delete_account_cascade error:', cascadeError)
    return NextResponse.json({ error: 'Failed to delete account data. Please try again.' }, { status: 500 })
  }

  // Delete auth accounts of members who now belong to no organisation
  if (Array.isArray(orphanedIds) && orphanedIds.length > 0) {
    await Promise.all(
      (orphanedIds as string[]).map(id => admin.auth.admin.deleteUser(id))
    )
  }

  // Delete the requesting user's own auth account (profiles cascade from auth.users)
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('deleteUser error:', deleteError)
    return NextResponse.json({ error: 'Failed to delete account. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
