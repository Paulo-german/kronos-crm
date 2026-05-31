'use server'

import { randomUUID } from 'crypto'
import { EntityType, Prisma } from '@prisma/client'
import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { createFieldDefinitionSchema } from './schema'

const POSITION_STEP = 1

export const createFieldDefinition = orgActionClient
  .schema(createFieldDefinitionSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: gerenciar definições é operação administrativa da org (OWNER/ADMIN)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // 2. MVP guard: apenas CONTACT é suportado
    if (data.entityType !== EntityType.CONTACT) {
      throw new Error('Campos personalizados para esta entidade ainda não estão disponíveis.')
    }

    // 3. Quota do plano (Light = 0 bloqueia; demais têm limite numérico)
    await requireQuota(ctx.orgId, 'custom_field')

    // 4. Key gerada no servidor — nunca aceitar do client (evita colisão com system fields)
    const key = `cf_${randomUUID()}`

    // 5. Posição = última posição da entidade + 1
    const lastDefinition = await db.fieldDefinition.findFirst({
      where: { organizationId: ctx.orgId, entityType: data.entityType, isActive: true },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = (lastDefinition?.position ?? -1) + POSITION_STEP

    const created = await db.fieldDefinition.create({
      data: {
        organizationId: ctx.orgId,
        entityType: data.entityType,
        key,
        label: data.label,
        type: data.type,
        isSystem: false,
        isRequired: data.isRequired,
        options: data.options && data.options.length > 0 ? data.options : Prisma.JsonNull,
        position,
        isActive: true,
      },
      select: { id: true },
    })

    revalidateTag(`field-definitions:${ctx.orgId}`)

    return { success: true, id: created.id }
  })
