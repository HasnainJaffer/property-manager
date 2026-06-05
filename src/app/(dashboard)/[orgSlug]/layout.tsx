import { createClient } from '@/lib/supabase/server'
import { OrgDataProvider } from '@/lib/org-data-context'

// Server component — resolves orgSlug and userId server-side so the client
// context never needs to call auth.getUser() (which can hang on Vercel).
export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <OrgDataProvider orgSlug={orgSlug} userId={user?.id ?? null}>
      {children}
    </OrgDataProvider>
  )
}
