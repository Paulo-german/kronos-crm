'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleTaskStatusSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import { findTaskWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleTaskStatus = orgActionClient
  .schema(toggleTaskStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'update'))

    // 2. Buscar tarefa com verificação RBAC (já valida acesso)
    await findTaskWithRBAC(data.id, ctx)

    // 3. Buscar dados completos para activity
    const task = await db.task.findFirst({
      where: { id: data.id },
    })

    if (!task) {
      throw new Error('Tarefa não encontrada.')
    }

    // 4. Toggle o status
    await db.task.update({
      where: { id: data.id },
      data: {
        isCompleted: !task.isCompleted,
      },
    })

    // Se completou a task e ela tem deal, cria atividade
    if (!task.isCompleted && task.dealId) {
      await db.activity.create({
        data: {
          type: 'task_completed',
          content: task.title,
          dealId: task.dealId,
        },
      })
    }

    revalidateTag(`tasks:${ctx.orgId}`)
    if (task.dealId) revalidateTag(`deal:${task.dealId}`)
    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (task.dealId) revalidatePath(`/pipeline/deal/${task.dealId}`)

    return { success: true, isCompleted: !task.isCompleted }
  })
