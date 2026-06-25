'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { findTaskWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleTask = orgActionClient
  .schema(toggleTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'crmTask', 'update'))

    // 2. Busca a tarefa com verificação RBAC
    const task = await findTaskWithRBAC(data.taskId, ctx)

    // 3. Toggle o status (reabertura limpa o outcome para evitar estado inconsistente)
    await db.crmTask.update({
      where: { id: data.taskId },
      data: {
        isCompleted: !task.isCompleted,
        ...(task.isCompleted ? { outcomeType: null, outcomeNotes: null } : {}),
      },
    })

    if (task.dealId) {
      revalidateTag(`deal:${task.dealId}`)
    }
    revalidateTag(`tasks:${ctx.orgId}`)

    return { success: true, isCompleted: !task.isCompleted }
  })
