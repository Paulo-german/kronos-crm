'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { toggleAutomationSchema } from './schema'

export const toggleAutomation = orgActionClient
  .schema(toggleAutomationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas ADMIN/OWNER pode ativar/desativar automações
    requirePermission(canPerformAction(ctx, 'automation', 'update'))

    // 2. Verificar que a automação pertence à organização (ownership check)
    const automation = await db.automation.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!automation) {
      throw new Error('Automação não encontrada.')
    }

    await db.automation.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    })

    revalidateTag(`automations:${ctx.orgId}`)
    revalidateTag(`automation:${data.id}`)
    revalidatePath('/settings/automations')

    return { success: true, isActive: data.isActive }
  })
