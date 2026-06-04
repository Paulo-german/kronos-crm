'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { completeTaskWithOutcomeSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import {
  findTaskWithRBAC,
  canPerformAction,
  requirePermission,
} from '@/_lib/rbac'
import {
  getOutcomeLabel,
  mapTaskTypeToActivityType,
} from '@/_lib/task/outcome-config'
import type { ActivityType } from '@prisma/client'

export const completeTaskWithOutcome = orgActionClient
  .schema(completeTaskWithOutcomeSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Permissão base
    requirePermission(canPerformAction(ctx, 'task', 'update'))

    // 2. RBAC: garante acesso à task
    await findTaskWithRBAC(data.id, ctx)

    // 3. Dados completos (type/title não vêm do helper RBAC)
    const task = await db.task.findFirst({
      where: { id: data.id },
      select: {
        id: true,
        type: true,
        title: true,
        dealId: true,
        isCompleted: true,
      },
    })

    if (!task) {
      throw new Error('Tarefa não encontrada.')
    }

    if (task.isCompleted) {
      throw new Error('Tarefa já está concluída.')
    }

    await db.task.update({
      where: { id: data.id },
      data: {
        isCompleted: true,
        outcomeType: data.outcomeType,
        outcomeNotes: data.outcomeNotes?.trim() || null,
      },
    })

    if (task.dealId) {
      const outcomeLabel = getOutcomeLabel(task.type, data.outcomeType)
      const notes = data.outcomeNotes?.trim()
      const content = notes ? `${outcomeLabel} · ${notes}` : outcomeLabel

      await db.activity.create({
        data: {
          type: mapTaskTypeToActivityType(task.type) as ActivityType,
          content,
          dealId: task.dealId,
          performedBy: ctx.userId,
          metadata: {
            taskId: task.id,
            taskTitle: task.title,
            outcomeType: data.outcomeType,
          },
        },
      })
    }

    revalidateTag(`tasks:${ctx.orgId}`)
    if (task.dealId) {
      revalidateTag(`deal:${task.dealId}`)
    }

    return { success: true }
  })
