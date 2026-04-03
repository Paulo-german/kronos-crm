'use server'

import { after } from 'next/server'
import { orgActionClient } from '@/_lib/safe-action'
import { updateTaskSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidatePath, revalidateTag } from 'next/cache'
import {
  canPerformAction,
  canAccessRecord,
  canTransferOwnership,
  requirePermission,
  isOwnershipChange,
} from '@/_lib/rbac'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'

export const updateTask = orgActionClient
  .schema(updateTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'update'))

    // 2. Buscar tarefa existente
    const existingTask = await db.task.findFirst({
      where: {
        id: data.id,
        organizationId: ctx.orgId,
      },
    })

    if (!existingTask) {
      throw new Error('Tarefa não encontrada.')
    }

    // 3. Verificar acesso ao registro (MEMBER só edita próprias)
    requirePermission(
      canAccessRecord(ctx, { assignedTo: existingTask.assignedTo })
    )

    // 4. Se está mudando assignedTo, verificar permissão de transferência
    if (isOwnershipChange(data.assignedTo, existingTask.assignedTo)) {
      requirePermission(canTransferOwnership(ctx))
    }

    // 5. Validar novo deal se mudou
    if (data.dealId !== existingTask.dealId) {
      const newDeal = await db.deal.findFirst({
        where: { id: data.dealId, organizationId: ctx.orgId },
      })

      if (!newDeal) {
        throw new Error('Negócio não encontrado ou sem acesso')
      }
    }

    // Build update data dynamically to avoid Prisma type conflicts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      title: data.title,
      dueDate: data.dueDate,
      dealId: data.dealId,
      type: data.type,
      isCompleted: data.isCompleted,
    }

    // Only update assignedTo if provided and not null (field is required in schema)
    if (data.assignedTo !== undefined && data.assignedTo !== null) {
      updateData.assignedTo = data.assignedTo
    }

    await db.task.update({
      where: { id: data.id },
      data: updateData,
    })

    revalidateTag(`tasks:${ctx.orgId}`)
    revalidateTag(`deal:${data.dealId}`)
    if (existingTask.dealId !== data.dealId) {
      revalidateTag(`deal:${existingTask.dealId}`)
    }
    revalidatePath('/crm/tasks')
    revalidatePath('/crm/deals/pipeline')
    revalidatePath(`/crm/deals/${data.dealId}`)
    if (existingTask.dealId !== data.dealId) {
      revalidatePath(`/crm/deals/${existingTask.dealId}`)
    }

    // Notificar novo responsável quando há transferência de ownership para outro usuário
    if (
      isOwnershipChange(data.assignedTo, existingTask.assignedTo) &&
      data.assignedTo !== undefined &&
      data.assignedTo !== null &&
      data.assignedTo !== ctx.userId
    ) {
      const newAssignedTo = data.assignedTo
      after(async () => {
        const slug = await getOrgSlug(ctx.orgId)
        await createNotification({
          orgId: ctx.orgId,
          userId: newAssignedTo,
          type: 'USER_ACTION',
          title: 'Tarefa transferida para você',
          body: `A tarefa "${existingTask.title}" foi transferida para você.`,
          actionUrl: `/org/${slug}/crm/tasks`,
          resourceType: 'task',
          resourceId: data.id,
        })
      })
    }

    return { success: true }
  })
