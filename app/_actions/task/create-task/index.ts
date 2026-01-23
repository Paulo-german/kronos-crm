'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const createTask = authActionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    const dealIdValue = data.dealId ?? null

    // Criação
    await db.task.create({
      data: {
        title: data.title,
        dueDate: data.dueDate ?? null,
        dealId: dealIdValue,
        assignedTo: ctx.userId,
        createdBy: ctx.userId,
      },
    })

    // Se tiver dealId, criar activity (opcional)
    if (dealIdValue) {
      await db.activity.create({
        data: {
          type: 'task_created',
          content: data.title,
          dealId: dealIdValue,
        },
      })
    }

    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (dealIdValue) revalidatePath(`/pipeline/deal/${dealIdValue}`)

    return { success: true }
  })
