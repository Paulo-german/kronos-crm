'use server'

import { actionClient } from '@/_lib/safe-action'
import { createClient } from '@/_lib/supabase/server'
import { redirect } from 'next/navigation'

export const signOut = actionClient.action(async () => {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
})
