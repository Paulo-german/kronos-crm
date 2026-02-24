'use server'

import { headers } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { forgotPasswordSchema } from './schema'

export const forgotPassword = actionClient
  .schema(forgotPasswordSchema)
  .action(async ({ parsedInput: { email } }) => {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/confirm`,
    })

    // Sempre retorna sucesso para evitar enumeração de emails
    return { success: true }
  })
