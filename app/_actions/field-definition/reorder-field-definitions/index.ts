'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { reorderFieldDefinitionsSchema } from './schema'

export const reorderFieldDefinitions = orgActionClient
  .schema(reorderFieldDefinitionsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Apenas campos custom da org+entityType podem ser reordenados
    const customDefinitions = await db.fieldDefinition.findMany({
      where: {
        organizationId: ctx.orgId,
        entityType: data.entityType,
        isSystem: false,
        isActive: true,
      },
      select: { id: true },
    })

    const allowedIds = new Set(customDefinitions.map((definition) => definition.id))
    const hasInvalidId = data.items.some((item) => !allowedIds.has(item.id))

    if (hasInvalidId) {
      throw new Error('Um ou mais campos não pertencem à organização ou não são reordenáveis.')
    }

    // Transação garante atomicidade da reordenação
    await db.$transaction(
      data.items.map((item) =>
        db.fieldDefinition.update({
          where: { id: item.id },
          data: { position: item.position },
        }),
      ),
    )

    revalidateTag(`field-definitions:${ctx.orgId}`)

    return { success: true }
  })
