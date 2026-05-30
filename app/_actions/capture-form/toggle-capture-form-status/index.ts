'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleCaptureFormStatusSchema } from '../schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleCaptureFormStatus = orgActionClient
  .schema(toggleCaptureFormStatusSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'captureForm', 'update'))

    const existing = await db.captureForm.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })
    if (!existing) throw new Error('Formulário não encontrado.')

    await db.$transaction(async (tx) => {
      await tx.captureForm.update({
        where: { id: data.id },
        data: { isActive: data.isActive },
      })
      await tx.captureSource.update({
        where: { id: existing.captureSourceId },
        data: { isActive: data.isActive },
      })
    })

    revalidateTag(`capture-forms:${ctx.orgId}`)
    revalidateTag(`capture-form-token:${existing.publicToken}`)

    return { success: true }
  })
