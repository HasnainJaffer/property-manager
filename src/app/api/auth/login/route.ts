import { createServerClient } from '@supabase/ssr'
import { type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = (formData.get('email') ?? '') as string
  const password = (formData.get('password') ?? '') as string
  const next = formData.get('next') as string | null
  const redirectPath = (typeof next === 'string' && next.startsWith('/')) ? next : '/dashboard'

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
    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', 'Invalid email or password')
    if (redirectPath !== '/dashboard') {
      errorUrl.searchParams.set('next', redirectPath)
    }
    return NextResponse.redirect(errorUrl, { status: 303 })
  }

  // 303 See Other converts the browser's POST into a GET for the redirect,
  // which is the standard POST→Redirect→GET pattern. Cookies are still committed
  // from this response before the browser issues the GET to /dashboard.
  const response = NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 })
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })

  return response
}
