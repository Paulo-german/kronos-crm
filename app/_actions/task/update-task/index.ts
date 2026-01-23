'use server'

import { authActionClient } from '@/_lib/safe-action'
import { updateTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const updateTask = authActionClient
  .schema(updateTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const dealIdValue = data.dealId ?? null

    // Verifica ownership
    const existingTask = await db.task.findFirst({
      where: {
        id: data.id,
        OR: [{ assignedTo: ctx.userId }, { createdBy: ctx.userId }],
      },
    })

    if (!existingTask) {
      throw new Error('Tarefa não encontrada ou não pertence a você.')
    }

    await db.task.update({
      where: { id: data.id },
      data: {
        title: data.title,
        dueDate: data.dueDate ?? null,
        type: data.type,
        isCompleted: data.isCompleted,
        dealId: dealIdValue,
      },
    })

    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (dealIdValue) revalidatePath(`/pipeline/deal/${dealIdValue}`)
    if (existingTask.dealId && existingTask.dealId !== dealIdValue) {
      revalidatePath(`/pipeline/deal/${existingTask.dealId}`)
    }

    return { success: true }
  })
