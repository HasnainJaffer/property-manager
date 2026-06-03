import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, next } = await request.json()
  const redirectPath = (typeof next === 'string' && next.startsWith('/')) ? next : '/dashboard'

  // Collect cookies set during auth so we can apply them to the response
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

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Redirect to /dashboard so the browser commits Set-Cookie headers as part of
  // a navigation response — this is synchronous on all browsers including iOS Safari,
  // unlike cookies from a JSON fetch response which Safari can defer.
  const response = NextResponse.redirect(new URL(redirectPath, request.url))
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
