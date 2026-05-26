import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { WebhookPlatform, WebhookEventType } from '@prisma/client'
import { resolveFieldMapping } from './resolve-field-mapping'
import { persistWebhookLog } from './persist-webhook-log'
import { handleUpsertContact } from './handlers/handle-upsert-contact'
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
    squadId: string | null
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
      case 'UPSERT_CONTACT':
        result = await handleUpsertContact({ orgId: source.organizationId, squadId: source.squadId, resolved })
        break
      // Legado: fontes criadas antes da migração para UPSERT_CONTACT
      case 'NEW_CONTACT':
        result = await handleNewContact({ orgId: source.organizationId, squadId: source.squadId, resolved })
        break
      case 'UPDATE_CONTACT':
        result = await handleUpdateContact({ orgId: source.organizationId, resolved })
        break
      case 'NEW_DEAL':
        result = await handleNewDeal({ orgId: source.organizationId, squadId: source.squadId, resolved })
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

  // persistWebhookLog é crítico para auditoria — se falhar, o evento perde rastreabilidade.
  // Relança a exceção para que waitUntil/replay sinalizem falha em vez de silenciar.
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

  // lastReceivedAt é não-crítico — falha aqui não compromete o log nem o dado principal
  try {
    await db.webhookSource.update({
      where: { id: source.id },
      data: { lastReceivedAt: new Date() },
    })
  } catch {
    // swallow: melhor perder a data da última atividade do que falhar o processamento
  }

  revalidateTag(`webhook-sources:${source.organizationId}`)
  revalidateTag(`webhook-logs:${source.id}`)
  if (result.contactId) {
    revalidateTag(`contacts:${source.organizationId}`)
    // resolveCompanyId pode criar empresa nova — invalida companies mesmo quando apenas encontrou
    revalidateTag(`companies:${source.organizationId}`)
  }
  if (result.dealId) revalidateTag(`deals:${source.organizationId}`)

  return { id: log.id }
}
