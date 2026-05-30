'use server'

import { CaptureChannel } from '@prisma/client'
import { orgActionClient } from '@/_lib/safe-action'
import { createCaptureFormSchema } from '../schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'

export const createCaptureForm = orgActionClient
  .schema(createCaptureFormSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'captureForm', 'create'))
    await requireQuota(ctx.orgId, 'capture_form')

    // Nome é sempre visível e obrigatório — invariante do sistema
    const fields = { ...data.fields, name: { ...data.fields.name, visible: true, required: true } }

    if (data.squadId) {
      const squad = await db.squad.findFirst({
        where: { id: data.squadId, organizationId: ctx.orgId },
        select: { id: true },
      })
      if (!squad) throw new Error('Time não encontrado na organização.')
    }

    const form = await db.$transaction(async (tx) => {
      const source = await tx.captureSource.create({
        data: {
          organizationId: ctx.orgId,
          channel: CaptureChannel.EMBED_FORM,
          name: data.name,
          isActive: true,
          isAdHoc: false,
          createdByUserId: ctx.userId,
        },
      })

      return tx.captureForm.create({
        data: {
          organizationId: ctx.orgId,
          name: data.name,
          fields,
          buttonLabel: data.buttonLabel,
          successMessage: data.successMessage,
          redirectUrl: data.redirectUrl || null,
          distributionUserIds: data.distributionUserIds,
          squadId: data.squadId ?? null,
          isActive: data.isActive,
          captureSourceId: source.id,
        },
      })
    })

    revalidateTag(`capture-forms:${ctx.orgId}`)

    return { success: true, id: form.id, publicToken: form.publicToken }
  })
