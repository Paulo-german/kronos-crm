'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteFieldDefinitionSchema } from './schema'

export const deleteFieldDefinition = orgActionClient
  .schema(deleteFieldDefinitionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const definition = await db.fieldDefinition.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, isSystem: true },
    })

    if (!definition) {
      throw new Error('Campo não encontrado.')
    }

    if (definition.isSystem) {
      throw new Error('Campos do sistema não podem ser removidos.')
    }

    // Hard-delete dos valores + soft-delete da definição em transação atômica.
    // O admin confirmou que tem ciência da perda dos dados preenchidos.
    await db.$transaction([
      db.customFieldValue.deleteMany({
        where: { fieldDefinitionId: definition.id },
      }),
      db.fieldDefinition.update({
        where: { id: definition.id },
        data: { isActive: false },
      }),
    ])

    revalidateTag(`field-definitions:${ctx.orgId}`)

    return { success: true }
  })
