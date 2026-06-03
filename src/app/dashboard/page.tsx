import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardRedirect() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Find the user's most recent active profile and the org's slug
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!profile) redirect('/onboarding')

  const { data: org } = await supabase
    .from('organisations')
    .select('slug')
    .eq('id', profile.org_id)
    .single()

  if (!org?.slug) redirect('/onboarding')

  redirect(`/${org.slug}/dashboard`)
}
