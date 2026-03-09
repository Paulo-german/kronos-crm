'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const completeOnboarding = orgActionClient.action(async ({ ctx }) => {
  requirePermission(canPerformAction(ctx, 'organization', 'update'))
  revalidateTag(`onboarding:${ctx.orgId}`)
  return { success: true }
})
