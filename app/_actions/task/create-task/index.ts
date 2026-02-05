'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
} from '@/_lib/rbac'

export const createTask = orgActionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'create'))

    // 2. Verificar quota do plano (tasks não têm quota separada, verificamos deals)
    // Tasks são ilimitadas por enquanto

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    const dealIdValue = data.dealId ?? null

    // 4. Criação
    await db.task.create({
      data: {
        organizationId: ctx.orgId,
        title: data.title,
        dueDate: data.dueDate ?? null,
        dealId: dealIdValue,
        assignedTo,
        createdBy: ctx.userId,
        type: data.type,
        isCompleted: data.isCompleted ?? false,
      },
    })

    // Se tiver dealId, criar activity
    if (dealIdValue) {
      await db.activity.create({
        data: {
          type: 'task_created',
          content: data.title,
          dealId: dealIdValue,
        },
      })
    }

    revalidateTag(`tasks:${ctx.orgId}`)
    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (dealIdValue) revalidatePath(`/pipeline/deal/${dealIdValue}`)

    return { success: true }
  })
