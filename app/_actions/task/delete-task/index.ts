'use server'

import { authActionClient } from '@/_lib/safe-action'
import { deleteTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const deleteTask = authActionClient
  .schema(deleteTaskSchema)
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

    await db.task.delete({
      where: { id: data.id },
    })

    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (task.dealId) revalidatePath(`/pipeline/deal/${task.dealId}`)

    return { success: true }
  })
