import { db } from '@/_lib/prisma'
import { Prisma, type WebhookLogStatus } from '@prisma/client'

interface PersistInput {
  webhookSourceId: string
  organizationId: string
  externalEventId?: string | null
  payload: unknown
  resolvedData: Record<string, unknown>
  status: WebhookLogStatus
  errorMessage?: string | null
  contactId?: string | null
  dealId?: string | null
}

export async function persistWebhookLog(input: PersistInput) {
  return db.webhookLog.create({
    data: {
      webhookSourceId: input.webhookSourceId,
      organizationId: input.organizationId,
      externalEventId: input.externalEventId ?? null,
      payload: input.payload as Prisma.InputJsonValue,
      resolvedData: input.resolvedData as Prisma.InputJsonValue,
      status: input.status,
      errorMessage: input.errorMessage ?? null,
      contactId: input.contactId ?? null,
      dealId: input.dealId ?? null,
    },
    select: { id: true },
  })
}
