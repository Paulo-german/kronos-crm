'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { createTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  requirePermission,
  resolveAssignedTo,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'

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
    const task = await db.task.create({
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
        performedBy: ctx.userId,
      },
    })

    revalidateTag(`tasks:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    revalidatePath('/crm/tasks')
    revalidatePath('/crm/deals/pipeline')
    revalidatePath(`/crm/deals/${data.dealId}`)

    // Notificar responsável quando a tarefa é atribuída a outro usuário
    if (assignedTo !== ctx.userId) {
      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: assignedTo,
          type: 'USER_ACTION',
          title: 'Nova tarefa atribuída a você',
          body: `A tarefa "${data.title}" foi atribuída a você.`,
          actionUrl: `/org/${slug}/crm/tasks`,
          resourceType: 'task',
          resourceId: task.id,
        })
      })
    }

    return { success: true }
  })
