'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { deleteAutomationSchema } from './schema'

export const deleteAutomation = orgActionClient
  .schema(deleteAutomationSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas ADMIN/OWNER pode deletar automações
    requirePermission(canPerformAction(ctx, 'automation', 'delete'))

    // 2. Verificar que a automação pertence à organização (ownership check)
    const automation = await db.automation.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!automation) {
      throw new Error('Automação não encontrada.')
    }

    // Cascade para AutomationExecution está configurado no schema Prisma
    await db.automation.delete({ where: { id: data.id } })

    revalidateTag(`automations:${ctx.orgId}`)
    revalidateTag(`automation:${data.id}`)
    revalidatePath('/settings/automations')

    return { success: true }
  })
