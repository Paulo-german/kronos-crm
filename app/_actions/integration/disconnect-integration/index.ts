'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission, isElevated } from '@/_lib/rbac'
import { decryptToken } from '@/_lib/integrations/encryption'
import { revokeGoogleToken } from '@/_lib/integrations/google/google-oauth'
import { disconnectIntegrationSchema } from './schema'

export const disconnectIntegration = orgActionClient
  .schema(disconnectIntegrationSchema)
  .action(async ({ parsedInput: { integrationId }, ctx }) => {
    // 1. Verificar permissão base
    requirePermission(canPerformAction(ctx, 'integration', 'delete'))

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

    // 3. Verificar ownership: MEMBER só pode desconectar a própria integração
    const elevated = isElevated(ctx.userRole)
    if (!elevated && integration.userId !== ctx.userId) {
      throw new Error('Você só pode desconectar sua própria integração.')
    }

    // 4. Tentar revogar o token no Google (ignora falhas — pode já ter sido revogado)
    try {
      const accessToken = decryptToken(integration.accessTokenEncrypted)
      await revokeGoogleToken(accessToken)
    } catch {
      // Token pode já ter sido revogado externamente — continua com a desconexão local
    }

    // 5. Deletar todos os CalendarSyncMappings (appointments locais permanecem intactos)
    await db.calendarSyncMapping.deleteMany({
      where: { integrationId },
    })

    // 6. Marcar integração como REVOKED (soft delete — mantemos histórico)
    await db.userIntegration.update({
      where: { id: integrationId },
      data: { status: 'REVOKED' },
    })

    // 7. Invalidar cache
    revalidateTag(`integrations:${ctx.orgId}`)
    revalidateTag(`integration:${integrationId}`)

    return { success: true }
  })
