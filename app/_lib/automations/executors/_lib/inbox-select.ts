import 'server-only'
import type { Prisma } from '@prisma/client'

// Re-exporta da fonte canônica (schema Zod) para que executores e UI usem o mesmo valor
export { SENTINEL_DEAL_INBOX } from '@/_actions/automation/create-automation/schema'

// Select reutilizado para inbox tanto no path direto quanto no sentinela.
// Compartilhado entre os executores de follow-up (deal e contact) para evitar drift.
export const INBOX_SELECT = {
  id: true,
  connectionType: true,
  channel: true,
  evolutionInstanceName: true,
  evolutionApiUrl: true,
  evolutionApiKey: true,
  metaPhoneNumberId: true,
  metaAccessToken: true,
  metaIgUserId: true,
  zapiInstanceId: true,
  zapiToken: true,
  zapiClientToken: true,
} as const

export type InboxRow = Prisma.InboxGetPayload<{ select: typeof INBOX_SELECT }>
