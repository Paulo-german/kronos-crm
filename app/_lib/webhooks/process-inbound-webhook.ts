import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { WebhookPlatform, WebhookEventType } from '@prisma/client'
import { resolveFieldMapping } from './resolve-field-mapping'
import { persistWebhookLog } from './persist-webhook-log'
import { handleNewContact } from './handlers/handle-new-contact'
import { handleUpdateContact } from './handlers/handle-update-contact'
import { handleNewDeal } from './handlers/handle-new-deal'
import { handleUpdateDeal } from './handlers/handle-update-deal'
import { handleDealClosed } from './handlers/handle-deal-closed'

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  dealId?: string
  errorMessage?: string
}

interface ProcessInput {
  source: {
    id: string
    organizationId: string
    platform: WebhookPlatform
    eventType: WebhookEventType
    fieldMapping: Record<string, string>
    isActive: boolean
    secretKey: string | null
  }
  payload: unknown
  externalEventId: string | null
  isReplay: boolean
}

export async function processInboundWebhook(input: ProcessInput): Promise<{ id: string }> {
  const { source, payload, externalEventId } = input

  const resolved = resolveFieldMapping(source.fieldMapping, payload)

  let result: ProcessResult
  try {
    switch (source.eventType) {
      case 'NEW_CONTACT':
        result = await handleNewContact({ orgId: source.organizationId, resolved })
        break
      case 'UPDATE_CONTACT':
        result = await handleUpdateContact({ orgId: source.organizationId, resolved })
        break
      case 'NEW_DEAL':
        result = await handleNewDeal({ orgId: source.organizationId, resolved })
        break
      case 'UPDATE_DEAL':
        result = await handleUpdateDeal({ orgId: source.organizationId, resolved })
        break
      case 'DEAL_CLOSED':
        result = await handleDealClosed({ orgId: source.organizationId, resolved })
        break
      default:
        result = { status: 'IGNORED' }
    }
  } catch (error) {
    result = {
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }

  const log = await persistWebhookLog({
    webhookSourceId: source.id,
    organizationId: source.organizationId,
    externalEventId,
    payload,
    resolvedData: resolved,
    status: result.status,
    errorMessage: result.errorMessage ?? null,
    contactId: result.contactId ?? null,
    dealId: result.dealId ?? null,
  })

  await db.webhookSource.update({
    where: { id: source.id },
    data: { lastReceivedAt: new Date() },
  })

  revalidateTag(`webhook-sources:${source.organizationId}`)
  revalidateTag(`webhook-logs:${source.id}`)
  if (result.contactId) revalidateTag(`contacts:${source.organizationId}`)
  if (result.dealId) revalidateTag(`deals:${source.organizationId}`)

  return { id: log.id }
}
