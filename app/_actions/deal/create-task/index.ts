'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  findDealWithRBAC,
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
} from '@/_lib/rbac'

export const createTask = orgActionClient
  .schema(createTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base para criar tasks
    requirePermission(canPerformAction(ctx, 'task', 'create'))

    // 2. Buscar deal com verificação RBAC (acessa o deal pai)
    await findDealWithRBAC(data.dealId, ctx)

    // 3. Resolver assignedTo (MEMBER = forçado para si mesmo)
    const assignedTo = resolveAssignedTo(ctx, data.assignedTo)

    // 4. Cria a tarefa
    await db.task.create({
      data: {
        organizationId: ctx.orgId,
        title: data.title,
        dueDate: data.dueDate || null,
        dealId: data.dealId,
        assignedTo,
        createdBy: ctx.userId,
      },
    })

    await db.activity.create({
      data: {
        type: 'task_created',
        content: data.title,
        dealId: data.dealId,
        performedBy: ctx.userId,
      },
    })

    revalidatePath('/pipeline')
    revalidatePath(`/pipeline/deal/${data.dealId}`)
    revalidateTag(`tasks:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)

    return { success: true }
  })
