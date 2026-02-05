'use server'

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

export const updateTask = orgActionClient
  .schema(updateTaskSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'task', 'update'))

    const dealIdValue = data.dealId ?? null

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

    // Build update data dynamically to avoid Prisma type conflicts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {
      title: data.title,
      dueDate: data.dueDate ?? null,
      type: data.type,
      isCompleted: data.isCompleted,
    }

    // Handle deal relation properly to avoid Prisma type conflicts
    if (dealIdValue === null) {
      updateData.deal = { disconnect: true }
    } else {
      updateData.deal = { connect: { id: dealIdValue } }
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
    revalidatePath('/tasks')
    revalidatePath('/pipeline')
    if (dealIdValue) revalidatePath(`/pipeline/deal/${dealIdValue}`)
    if (existingTask.dealId && existingTask.dealId !== dealIdValue) {
      revalidatePath(`/pipeline/deal/${existingTask.dealId}`)
    }

    return { success: true }
  })
