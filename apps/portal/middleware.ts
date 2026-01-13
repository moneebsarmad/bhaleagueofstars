import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => request.cookies.get(name)?.value,
      set: (name, value, options) => {
        response.cookies.set({ name, value, ...options })
      },
      remove: (name, options) => {
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  if (isAdminRoute && request.nextUrl.pathname !== '/admin' && !user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/admin'
    return NextResponse.redirect(redirectUrl)
  }

  if (request.nextUrl.pathname === '/admin' && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/admin/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
}
