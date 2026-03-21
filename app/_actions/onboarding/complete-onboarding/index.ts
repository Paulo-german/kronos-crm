'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'

export const completeOnboarding = orgActionClient.action(async ({ ctx }) => {
  requirePermission(canPerformAction(ctx, 'organization', 'update'))

  // Safety net: garante que onboardingCompleted = true no banco
  // No fluxo normal o seedOrganization já marca, mas em cenários parciais
  // (ex: conta que já tinha dados e só conectou WhatsApp) o seed não roda.
  await db.organization.update({
    where: { id: ctx.orgId },
    data: { onboardingCompleted: true },
  })

  revalidateTag(`onboarding:${ctx.orgId}`)
  return { success: true }
})
