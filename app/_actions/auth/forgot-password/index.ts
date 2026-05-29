'use server'

import { headers } from 'next/headers'
import { createClient } from '@/_lib/supabase/server'
import { actionClient } from '@/_lib/safe-action'
import { forgotPasswordSchema } from './schema'

// Rate limiting via Supabase Auth (Auth > Rate Limits no dashboard) — rate-limiter.ts em memória não funciona em serverless.
export const forgotPassword = actionClient
  .schema(forgotPasswordSchema)
  .action(async ({ parsedInput: { email } }) => {
    const supabase = await createClient()
    const headersList = await headers()
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_APP_URL

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/recovery`,
    })

    // Sempre retorna sucesso para evitar enumeração de emails
    return { success: true }
  })
