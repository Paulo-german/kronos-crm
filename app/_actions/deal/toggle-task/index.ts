'use server'

import { authActionClient } from '@/_lib/safe-action'
import { toggleTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const toggleTask = authActionClient
  .schema(toggleTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Busca a tarefa com validação de ownership
    const task = await db.task.findFirst({
      where: {
        id: data.taskId,
        deal: {
          stage: {
            pipeline: {
              createdBy: ctx.userId,
            },
          },
        },
      },
    })

    if (!task) {
      throw new Error('Tarefa não encontrada ou não pertence a você.')
    }

    // Toggle o status
    await db.task.update({
      where: { id: data.taskId },
      data: {
        isCompleted: !task.isCompleted,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${task.dealId}`)

    return { success: true, isCompleted: !task.isCompleted }
  })
