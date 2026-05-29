'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { authActionClient } from '@/_lib/safe-action'
import { resetPasswordSchema } from './schema'

export const resetPassword = authActionClient
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput: { password } }) => {
    const cookieStore = await cookies()

    if (cookieStore.get('recovery_in_progress')?.value !== '1') {
      throw new Error('Sessão de recuperação inválida ou expirada. Solicite um novo link.')
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      throw new Error('Erro ao redefinir senha. Tente novamente.')
    }

    await supabase.auth.signOut({ scope: 'global' })

    cookieStore.delete('recovery_in_progress')

    redirect('/login?reset=success')
  })
