import { db } from '@/_lib/prisma'
import type { IntegrationProvider } from '@prisma/client'
import { decryptToken } from '@/_lib/integrations/encryption'
import type { UserIntegrationWithTokens } from './types'

/**
 * Busca integração ativa com tokens decriptados para uso em sincronização.
 * SEM cache — roda no Trigger.dev e precisa dos tokens reais e frescos.
 * Retorna null se não há integração ativa (não é erro — apenas noop no sync).
 */
export const getActiveIntegrationForSync = async (
  userId: string,
  orgId: string,
  provider: IntegrationProvider,
): Promise<UserIntegrationWithTokens | null> => {
  const integration = await db.userIntegration.findUnique({
    where: {
      userId_organizationId_provider: {
        userId,
        organizationId: orgId,
        provider,
      },
    },
    select: {
      id: true,
      userId: true,
      organizationId: true,
      provider: true,
      status: true,
      accessTokenEncrypted: true,
      refreshTokenEncrypted: true,
      tokenExpiresAt: true,
      providerAccountId: true,
      providerMetadata: true,
      lastSyncAt: true,
    },
  })

  if (!integration) return null
  if (integration.status !== 'ACTIVE') return null

  const accessToken = decryptToken(integration.accessTokenEncrypted)
  const refreshToken = decryptToken(integration.refreshTokenEncrypted)

  return {
    id: integration.id,
    userId: integration.userId,
    organizationId: integration.organizationId,
    provider: integration.provider,
    accessToken,
    refreshToken,
    tokenExpiresAt: integration.tokenExpiresAt,
    providerAccountId: integration.providerAccountId,
    providerMetadata: integration.providerMetadata as Record<string, unknown> | null,
    lastSyncAt: integration.lastSyncAt,
  }
}
