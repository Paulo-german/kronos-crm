'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { triggerFullSyncSchema } from './schema'

export const triggerFullSync = orgActionClient
  .schema(triggerFullSyncSchema)
  .action(async ({ parsedInput: { integrationId }, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'integration', 'update'))

    // 2. Buscar integração e validar pertencimento à org
    const integration = await db.userIntegration.findFirst({
      where: {
        id: integrationId,
        organizationId: ctx.orgId,
      },
    })

    if (!integration) {
      throw new Error('Integração não encontrada.')
    }

    // 3. Verificar ownership: MEMBER só pode sincronizar a própria integração
    const elevated = isElevated(ctx.userRole)
    if (!elevated && integration.userId !== ctx.userId) {
      throw new Error('Você só pode sincronizar sua própria integração.')
    }

    // 4. Verificar se a integração está ativa
    if (integration.status !== 'ACTIVE') {
      throw new Error('A integração precisa estar ativa para sincronizar. Reconecte sua conta.')
    }

    // 5. Atualizar lastSyncAt para indicar que o sync foi solicitado
    // A Trigger.dev task de full-calendar-sync será adicionada na Fase 3
    await db.userIntegration.update({
      where: { id: integrationId },
      data: { lastSyncAt: new Date() },
    })

    // 6. Invalidar cache
    revalidateTag(`integrations:${ctx.orgId}`)
    revalidateTag(`integration:${integrationId}`)

    return { success: true }
  })
