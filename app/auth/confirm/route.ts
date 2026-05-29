import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()

  // PKCE flow: troca o code por sessão (email confirmation, magic link, etc.)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL('/org', request.url))
    }

    console.error('Erro ao trocar code por sessão:', error.message)
    return NextResponse.redirect(new URL('/auth/auth-code-error?reason=signup', request.url))
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

    if (type === 'recovery') {
      return NextResponse.redirect(new URL('/auth/auth-code-error?reason=recovery', request.url))
    }

    if (type === 'signup' || type === 'email') {
      return NextResponse.redirect(new URL('/auth/auth-code-error?reason=signup', request.url))
    }

    return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
