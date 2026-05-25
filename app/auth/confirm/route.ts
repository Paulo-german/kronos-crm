import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  const supabase = await createClient()

  // PKCE flow (cliente SSR padrão): troca o code por sessão
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      const next = searchParams.get('next') ?? '/org'
      return NextResponse.redirect(new URL(next, request.url))
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
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      return NextResponse.redirect(new URL('/org', request.url))
    }

    console.error('Erro na confirmação de email:', error.message)
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
