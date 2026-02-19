'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  requirePermission,
} from '@/_lib/rbac'

export const deleteTask = orgActionClient
  .schema(deleteTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'delete'))

    // 2. Buscar tarefa
    const task = await db.task.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!task) {
      throw new Error('Tarefa não encontrada.')
    }

    // 3. Verificar acesso ao registro (MEMBER pode deletar próprias)
    requirePermission(canAccessRecord(ctx, { assignedTo: task.assignedTo }))

    await db.task.delete({
      where: { id: data.id },
    })

    revalidateTag(`tasks:${ctx.orgId}`)
    if (task.dealId) revalidateTag(`deal:${task.dealId}`)
    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (task.dealId) revalidatePath(`/pipeline/deal/${task.dealId}`)

    return { success: true }
  })
