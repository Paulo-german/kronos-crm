'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleTaskStatusSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findTaskWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleTaskStatus = orgActionClient
  .schema(toggleTaskStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'task', 'update'))
    await findTaskWithRBAC(data.id, ctx)

    const task = await db.task.findFirst({ where: { id: data.id } })
    if (!task) throw new Error('Tarefa não encontrada.')

    const willBeCompleted = !task.isCompleted

    await db.task.update({
      where: { id: data.id },
      data: {
        isCompleted: willBeCompleted,
        // Reabertura limpa o outcome anterior para evitar estado inconsistente
        ...(!willBeCompleted ? { outcomeType: null, outcomeNotes: null } : {}),
      },
    })

    // Caminho do "Concluir sem registrar": activity genérica
    if (willBeCompleted && task.dealId) {
      await db.activity.create({
        data: {
          type: 'task_completed',
          content: task.title,
          dealId: task.dealId,
          performedBy: ctx.userId,
        },
      })
    }

    revalidateTag(`tasks:${ctx.orgId}`)
    if (task.dealId) revalidateTag(`deal:${task.dealId}`)
    revalidatePath('/crm/tasks')
    revalidatePath('/crm/deals/pipeline')
    if (task.dealId) revalidatePath(`/crm/deals/${task.dealId}`)

    return { success: true, isCompleted: willBeCompleted }
  })
