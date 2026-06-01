'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateCaptureFormSchema } from '../schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateCaptureForm = orgActionClient
  .schema(updateCaptureFormSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'captureForm', 'update'))

    const existing = await db.captureForm.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })
    if (!existing) throw new Error('Formulário não encontrado.')

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

    await db.$transaction(async (tx) => {
      await tx.captureForm.update({
        where: { id: data.id },
        data: {
          name: data.name,
          fields,
          appearance: data.appearance,
          buttonLabel: data.buttonLabel,
          successMessage: data.successMessage,
          redirectUrl: data.redirectUrl || null,
          distributionUserIds: data.distributionUserIds,
          squadId: data.squadId ?? null,
          isActive: data.isActive,
          consentRequired: data.consentRequired ?? true,
        },
      })
      // Mantém o nome do CaptureSource sincronizado para rastreabilidade
      await tx.captureSource.update({
        where: { id: existing.captureSourceId },
        data: { name: data.name },
      })

      // Replace-all: deleta a config atual e recria — chave composta torna o diff
      // manual (upsert/delete seletivo) mais complexo e propenso a erro que o replace
      await tx.captureFormField.deleteMany({ where: { captureFormId: data.id } })
      if (data.customFields.length > 0) {
        await tx.captureFormField.createMany({
          data: data.customFields.map((field) => ({
            captureFormId: data.id,
            fieldDefinitionId: field.fieldDefinitionId,
            required: field.required,
            labelOverride: field.labelOverride ?? null,
            position: field.position,
          })),
        })
      }
    })

    revalidateTag(`capture-forms:${ctx.orgId}`)
    revalidateTag(`capture-form-token:${existing.publicToken}`)

    return { success: true }
  })
