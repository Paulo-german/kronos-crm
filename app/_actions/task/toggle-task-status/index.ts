'use server'

import { authActionClient } from '@/_lib/safe-action'
import { toggleTaskStatusSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const toggleTaskStatus = authActionClient
  .schema(toggleTaskStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const task = await db.task.findFirst({
      where: {
        id: data.id,
        OR: [{ assignedTo: ctx.userId }, { createdBy: ctx.userId }],
      },
    })

    if (!task) {
      throw new Error('Tarefa não encontrada ou não pertence a você.')
    }

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

    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (task.dealId) revalidatePath(`/pipeline/deal/${task.dealId}`)

    return { success: true, isCompleted: !task.isCompleted }
  })
