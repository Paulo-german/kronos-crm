'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { supabaseAdmin } from '@/_lib/supabase/admin'
import { resendVerificationEmailSchema } from './schema'

export const resendVerificationEmail = superAdminActionClient
  .schema(resendVerificationEmailSchema)
  .action(async ({ parsedInput: { email } }) => {
    const { error } = await supabaseAdmin.auth.resend({
      type: 'signup',
      email,
    })

    if (error) throw new Error(error.message)

    return { success: true }
  })
