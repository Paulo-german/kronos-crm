'use server'

import { authActionClient } from '@/_lib/safe-action'
import { createTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath } from 'next/cache'

export const createTask = authActionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // Verifica ownership do deal
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        stage: {
          pipeline: {
            createdBy: ctx.userId,
          },
        },
      },
    })

    if (!deal) {
      throw new Error('Deal não encontrado ou não pertence a você.')
    }

    // Cria a tarefa
    await db.task.create({
      data: {
        title: data.title,
        dueDate: data.dueDate || null,
        dealId: data.dealId,
        assignedTo: ctx.userId,
        createdBy: ctx.userId,
      },
    })

    // Registra atividade
    await db.activity.create({
      data: {
        type: 'task_created',
        content: data.title,
        dealId: data.dealId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })
