import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/_lib/supabase/server'

/**
 * Rota de callback para confirmação de email.
 * O Supabase redireciona para cá quando o usuário clica no link de confirmação.
 *
 * Fluxo:
 * 1. Usuário clica no link do email (ex: ?token_hash=xxx&type=signup)
 * 2. Esta rota valida o token com o Supabase
 * 3. Se válido, redireciona para o seletor de org (logado)
 * 4. Se inválido, redireciona para uma página de erro
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })

    if (!error) {
      // Recovery flow: redireciona para redefinir senha ao invés do dashboard
      if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', request.url))
      }
      return NextResponse.redirect(new URL('/org', request.url))
    } else {
      console.error('Erro na confirmação de email:', error.message)
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', request.url))
}
