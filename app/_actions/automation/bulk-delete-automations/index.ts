'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { db } from '@/_lib/prisma'
import { bulkDeleteAutomationsSchema } from './schema'

export const bulkDeleteAutomations = orgActionClient
  .schema(bulkDeleteAutomationsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Apenas ADMIN/OWNER pode deletar automações em massa
    requirePermission(canPerformAction(ctx, 'automation', 'delete'))

    // 2. deleteMany com AND implícito: orgId garante que não deleta fora da organização
    // Cascade para AutomationExecution está configurado no schema Prisma
    const result = await db.automation.deleteMany({
      where: {
        id: { in: data.ids },
        organizationId: ctx.orgId,
      },
    })

    revalidateTag(`automations:${ctx.orgId}`)
    for (const id of data.ids) {
      revalidateTag(`automation:${id}`)
    }
    revalidatePath('/settings/automations')

    return { success: true, deleted: result.count }
  })
