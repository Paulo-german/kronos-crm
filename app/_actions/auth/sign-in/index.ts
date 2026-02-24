'use server'

import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { signInSchema } from './schema'
import { redirect } from 'next/navigation'

export const signInWithPassword = actionClient
  .schema(signInSchema)
  .action(async ({ parsedInput: { email, password, redirectTo } }) => {
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw new Error('Credenciais inválidas. Verifique seu email e senha.')
    }

    return redirect(redirectTo ?? '/org')
  })
