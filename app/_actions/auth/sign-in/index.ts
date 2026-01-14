'use server'

import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { signInSchema } from './schema'
import { redirect } from 'next/navigation'

interface SignInInput {
  email: string
  password: string
}

export const signInWithPassword = actionClient
  .schema(signInSchema)
  .action(
    async ({
      parsedInput: { email, password },
    }: {
      parsedInput: SignInInput
    }) => {
      console.log(email, password)
      const supabase = await createClient()
      console.log('Bateu depois do create client')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      console.log('Bateu depois do signInWithPassword')
      if (error) {
        // Retornamos um erro amigável que o safe-action captura
        throw new Error('Credenciais inválidas. Verifique seu email e senha.')
      }

      console.log(data)

      // Se deu certo, o Supabase já setou o cookie.
      // Agora apenas redirecionamos.
      return redirect('/dashboard')
    },
  )
