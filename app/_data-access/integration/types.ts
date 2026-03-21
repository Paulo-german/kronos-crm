import type { IntegrationProvider, IntegrationStatus } from '@prisma/client'

export interface UserIntegrationDto {
  id: string
  provider: IntegrationProvider
  status: IntegrationStatus
  providerAccountId: string | null
  lastSyncAt: Date | null
  syncError: string | null
  createdAt: Date
}

/**
 * Interface interna com tokens decriptados.
 * NUNCA exposta ao client — usada apenas por Trigger.dev tasks e server-side sync.
 */
export interface UserIntegrationWithTokens {
  id: string
  userId: string
  organizationId: string
  provider: IntegrationProvider
  accessToken: string
  refreshToken: string
  tokenExpiresAt: Date
  providerAccountId: string | null
  providerMetadata: Record<string, unknown> | null
  lastSyncAt: Date | null
}
