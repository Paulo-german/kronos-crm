import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'

function safeRedirect(path: string | null, fallback: string, base: string): NextResponse {
  const isRelative = path && path.startsWith('/') && !path.startsWith('//')
  const target = isRelative ? path : fallback
  return NextResponse.redirect(new URL(target, base))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  const supabase = await createClient()

  // PKCE flow (cliente SSR padrão): troca o code por sessão
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const response = safeRedirect(next, '/org', request.url)

      // Cookie de curta duração para validar que o /reset-password foi acessado via recovery link
      if (next === '/reset-password') {
        response.cookies.set('recovery_in_progress', '1', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 300,
          path: '/',
        })
      }

      return response
    }

    console.error('Erro ao trocar code por sessão:', error.message)
    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
  }

  // OTP flow (token_hash + type)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      if (type === 'recovery') {
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
      return NextResponse.redirect(new URL('/org', request.url))
    }

    console.error('Erro na confirmação de email:', error.message)
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
