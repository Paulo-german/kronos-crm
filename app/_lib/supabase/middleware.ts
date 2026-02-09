import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { ORG_SLUG_COOKIE } from '@/_lib/safe-action'

// Rotas legadas que serão redirecionadas para /org/[slug]/...
const LEGACY_ROUTES = [
  '/dashboard',
  '/companies',
  '/contacts',
  '/pipeline',
  '/tasks',
  '/settings',
]

// Rotas de auth (login, sign-up) - redireciona se JÁ estiver logado
const AUTH_ROUTES = ['/login', '/sign-up']

// Cookie para armazenar o último org slug acessado (para redirect)
const LAST_ORG_COOKIE = 'kronos-last-org-slug'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh session if expired
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // FORCE CLEAR COOKIE if param is present (Global Handler)
  const shouldClearCookie =
    request.nextUrl.searchParams.get('clear_last_org') === 'true'
  if (shouldClearCookie) {
    supabaseResponse.cookies.delete(LAST_ORG_COOKIE)
    request.cookies.delete(LAST_ORG_COOKIE)
  }

  const pathname = request.nextUrl.pathname

  // Raiz "/" redireciona baseado no estado de auth
  if (pathname === '/') {
    if (user) {
      // Tentar redirecionar para última org acessada
      const lastOrgSlug = request.cookies.get(LAST_ORG_COOKIE)?.value
      if (lastOrgSlug) {
        return NextResponse.redirect(
          new URL(`/org/${lastOrgSlug}/dashboard`, request.url),
        )
      }
      // Sem org salva, vai para seleção de org
      return NextResponse.redirect(new URL('/org', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Redirecionar rotas legadas para nova estrutura /org/[slug]/...
  const isLegacyRoute = LEGACY_ROUTES.some((route) =>
    pathname.startsWith(route),
  )
  if (isLegacyRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Redirecionar para última org ou seleção de org
    const lastOrgSlug = request.cookies.get(LAST_ORG_COOKIE)?.value
    if (lastOrgSlug) {
      const newPath = pathname.replace(/^\//, `/org/${lastOrgSlug}/`)
      return NextResponse.redirect(new URL(newPath, request.url))
    }
    return NextResponse.redirect(new URL('/org', request.url))
  }

  // Rotas /org/[slug]/... - extrair slug e setar cookie
  const orgRouteMatch = pathname.match(/^\/org\/([^/]+)/)
  if (orgRouteMatch) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const orgSlug = orgRouteMatch[1]

    // Setar cookies para uso nas server actions
    supabaseResponse.cookies.set(ORG_SLUG_COOKIE, orgSlug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60, // 1 hora
    })

    // Salvar como última org acessada (para redirects futuros)
    supabaseResponse.cookies.set(LAST_ORG_COOKIE, orgSlug, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    })

    return supabaseResponse
  }

  // Rota /org (seleção de organização) - requer auth
  if (pathname === '/org') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return supabaseResponse
  }

  // Se ESTÁ logado e tenta acessar login/sign-up → redirect para dashboard
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  if (isAuthRoute && user) {
    const lastOrgSlug = request.cookies.get(LAST_ORG_COOKIE)?.value
    if (lastOrgSlug) {
      return NextResponse.redirect(
        new URL(`/org/${lastOrgSlug}/dashboard`, request.url),
      )
    }
    return NextResponse.redirect(new URL('/org', request.url))
  }

  return supabaseResponse
}
