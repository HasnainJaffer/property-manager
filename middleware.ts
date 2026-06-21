import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get('host') ?? ''
  const isMarketingDomain = host === 'letroflow.com' || host === 'www.letroflow.com'

  // ── Marketing domain: rewrite every path to /landing ──────────────────────
  // letroflow.com/* → /landing (the isolated landing page route)
  // Skip static assets — they are handled by the matcher below.
  if (isMarketingDomain) {
    const url = request.nextUrl.clone()
    url.pathname = '/landing'
    return NextResponse.rewrite(url)
  }

  // ── App domain (app.letroflow.com / localhost) ─────────────────────────────
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session — must be called before any redirect logic
  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = pathname === '/login' || pathname === '/signup'
  const isPublic =
    isAuthPage ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/invite/') ||
    pathname.startsWith('/landing')

  // Unauthenticated user hitting a protected route → send to login
  if (!user && !isPublic && pathname !== '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user hitting login/signup → send to dashboard
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
