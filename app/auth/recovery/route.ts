import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/auth/auth-code-error?reason=recovery', request.url))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Erro ao trocar code por sessão (recovery):', error.message)
    return NextResponse.redirect(new URL('/auth/auth-code-error?reason=recovery', request.url))
  }

  const response = NextResponse.redirect(new URL('/reset-password', request.url))
  response.cookies.set('recovery_in_progress', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 300,
    path: '/',
  })

  return response
}
