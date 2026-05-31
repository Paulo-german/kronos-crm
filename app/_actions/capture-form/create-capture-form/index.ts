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

    // Valida que todos os campos custom pertencem à org — nunca confiar no client
    const customFieldIds = data.customFields.map((field) => field.fieldDefinitionId)
    if (customFieldIds.length > 0) {
      const validCount = await db.fieldDefinition.count({
        where: { id: { in: customFieldIds }, organizationId: ctx.orgId },
      })
      if (validCount !== customFieldIds.length) {
        throw new Error('Um ou mais campos personalizados são inválidos.')
      }
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

      const created = await tx.captureForm.create({
        data: {
          organizationId: ctx.orgId,
          name: data.name,
          fields,
          appearance: data.appearance,
          buttonLabel: data.buttonLabel,
          successMessage: data.successMessage,
          redirectUrl: data.redirectUrl || null,
          distributionUserIds: data.distributionUserIds,
          squadId: data.squadId ?? null,
          isActive: data.isActive,
          captureSourceId: source.id,
        },
      })

      if (data.customFields.length > 0) {
        await tx.captureFormField.createMany({
          data: data.customFields.map((field) => ({
            captureFormId: created.id,
            fieldDefinitionId: field.fieldDefinitionId,
            required: field.required,
            labelOverride: field.labelOverride ?? null,
            position: field.position,
          })),
        })
      }

      return created
    })

    revalidateTag(`capture-forms:${ctx.orgId}`)

    return { success: true, id: form.id, publicToken: form.publicToken }
  })
