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

    // 4. Validar que deal existe
    const deal = await db.deal.findFirst({
      where: {
        id: data.dealId,
        organizationId: ctx.orgId,
      },
    })

    if (!deal) {
      throw new Error('Negócio não encontrado ou sem acesso')
    }

    // 5. Criação
    await db.task.create({
      data: {
        organizationId: ctx.orgId,
        title: data.title,
        dueDate: data.dueDate,
        dealId: data.dealId,
        assignedTo,
        createdBy: ctx.userId,
        type: data.type,
        isCompleted: data.isCompleted ?? false,
      },
    })

    // Sempre criar activity (dealId sempre presente)
    await db.activity.create({
      data: {
        type: 'task_created',
        content: data.title,
        dealId: data.dealId,
      },
    })

    revalidateTag(`tasks:${ctx.orgId}`)
    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)

    return { success: true }
  })
