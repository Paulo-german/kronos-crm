'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'

export const revalidatePipeline = orgActionClient.action(async ({ ctx }) => {
  revalidateTag(`pipeline:${ctx.orgId}`)
  revalidateTag(`deals:${ctx.orgId}`)

  return { success: true }
})
