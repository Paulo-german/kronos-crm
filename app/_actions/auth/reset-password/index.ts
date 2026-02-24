'use server'

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

    return { success: true }
  })
