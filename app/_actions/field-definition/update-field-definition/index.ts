'use server'

import { FieldType, Prisma } from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateFieldDefinitionSchema } from './schema'

export const updateFieldDefinition = orgActionClient
  .schema(updateFieldDefinitionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Isolamento de org: só encontra definições da própria org
    const definition = await db.fieldDefinition.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, type: true, isSystem: true },
    })

    if (!definition) {
      throw new Error('Campo não encontrado.')
    }

    // Campos do sistema não são editáveis
    if (definition.isSystem) {
      throw new Error('Campos do sistema não podem ser editados.')
    }

    const isSelect = definition.type === FieldType.SELECT

    // SELECT exige ao menos uma opção quando o array é enviado
    if (isSelect && data.options !== undefined && data.options.length === 0) {
      throw new Error('Campos do tipo seleção precisam de ao menos uma opção.')
    }

    // `options` só faz sentido para SELECT — ignora silenciosamente em outros tipos
    // para não persistir lixo que vazaria no DTO de leitura.
    const shouldUpdateOptions = isSelect && data.options !== undefined

    await db.fieldDefinition.update({
      where: { id: definition.id },
      data: {
        ...(data.label !== undefined ? { label: data.label } : {}),
        ...(data.isRequired !== undefined ? { isRequired: data.isRequired } : {}),
        ...(shouldUpdateOptions
          ? { options: data.options && data.options.length > 0 ? data.options : Prisma.JsonNull }
          : {}),
      },
    })

    revalidateTag(`field-definitions:${ctx.orgId}`)

    return { success: true }
  })
