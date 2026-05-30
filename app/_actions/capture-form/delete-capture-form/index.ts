'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteCaptureFormSchema } from '../schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteCaptureForm = orgActionClient
  .schema(deleteCaptureFormSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'captureForm', 'delete'))

    const existing = await db.captureForm.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })
    if (!existing) throw new Error('Formulário não encontrado.')

    await db.$transaction(async (tx) => {
      await tx.captureForm.delete({ where: { id: data.id } })
      // Soft-deactivate preserva o histórico de CaptureEvents (onDelete: Restrict impede hard-delete)
      await tx.captureSource.update({
        where: { id: existing.captureSourceId },
        data: { isActive: false },
      })
    })

    revalidateTag(`capture-forms:${ctx.orgId}`)
    revalidateTag(`capture-form-token:${existing.publicToken}`)

    return { success: true }
  })
