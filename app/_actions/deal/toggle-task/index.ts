'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findTaskWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleTask = orgActionClient
  .schema(toggleTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'update'))

    // 2. Busca a tarefa com verificação RBAC
    const task = await findTaskWithRBAC(data.taskId, ctx)

    // 3. Toggle o status
    await db.task.update({
      where: { id: data.taskId },
      data: {
        isCompleted: !task.isCompleted,
      },
    })

    revalidatePath('/crm/pipeline')
    if (task.dealId) {
      revalidatePath(`/crm/pipeline/deal/${task.dealId}`)
      revalidateTag(`deal:${task.dealId}`)
    }
    revalidateTag(`tasks:${ctx.orgId}`)

    return { success: true, isCompleted: !task.isCompleted }
  })
