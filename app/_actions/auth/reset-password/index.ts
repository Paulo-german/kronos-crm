'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { authActionClient } from '@/_lib/safe-action'
import { resetPasswordSchema } from './schema'

export const resetPassword = authActionClient
  .schema(resetPasswordSchema)
  .action(async ({ parsedInput: { password } }) => {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      throw new Error('Erro ao redefinir senha. Tente novamente.')
    }

    await supabase.auth.signOut()

    const cookieStore = await cookies()
    cookieStore.delete('recovery_in_progress')

    redirect('/login?reset=success')
  })
