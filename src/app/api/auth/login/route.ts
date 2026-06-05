import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') ?? '') as string
  const password = (formData.get('password') ?? '') as string
  const next = formData.get('next') as string | null

  // Only honour ?next if it's an explicit non-dashboard path (e.g. invite redirect)
  const hasExplicitNext = typeof next === 'string' && next.startsWith('/') && next !== '/dashboard'

  const pendingCookies: Array<{ name: string; value: string; options: CookieOptions }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            pendingCookies.push({ name, value, options: options ?? {} })
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !user) {
    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', 'Invalid email or password')
    if (hasExplicitNext) errorUrl.searchParams.set('next', next!)
    return NextResponse.redirect(errorUrl, { status: 303 })
  }

  // Resolve the org slug here so we redirect directly to /{orgSlug}/dashboard,
  // skipping the /dashboard server component round trip (saves 3 Supabase calls).
  let destination = hasExplicitNext ? next! : '/dashboard'

  if (!hasExplicitNext) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (profile?.org_id) {
      const { data: org } = await supabase
        .from('organisations')
        .select('slug')
        .eq('id', profile.org_id)
        .single()

      if (org?.slug) destination = `/${org.slug}/dashboard`
    }
  }

  // 303 converts the browser's POST to a GET before navigating to destination.
  const response = NextResponse.redirect(new URL(destination, request.url), { status: 303 })
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
