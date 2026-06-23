import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import { CaptureChannel } from '@prisma/client'
import type { WebhookPlatform, WebhookEventType } from '@prisma/client'
import { resolveFieldMapping } from './resolve-field-mapping'
import { persistWebhookLog } from './persist-webhook-log'
import { handleUpsertContact } from './handlers/handle-upsert-contact'
import { handleNewContact } from './handlers/handle-new-contact'
import { handleUpdateContact } from './handlers/handle-update-contact'
import { handleNewDeal } from './handlers/handle-new-deal'
import { handleUpdateDeal } from './handlers/handle-update-deal'
import { handleDealClosed } from './handlers/handle-deal-closed'
import { evaluateAutomations } from '@/_lib/automations/evaluate-automations'
import type { ResolvedProviderEvent } from './resolve-provider-event'

interface ProcessResult {
  status: 'PROCESSED' | 'IGNORED' | 'ERROR'
  contactId?: string
  created?: boolean
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
    providerEvent: string | null
    fieldMapping: Record<string, string>
    isActive: boolean
    secretKey: string | null
  }
  payload: unknown
  externalEventId: string | null
  // Evento resolvido na rota (HMAC e parse já passaram). Resolver fica na rota
  // porque Headers não serializa de forma trivial para o waitUntil; assim o
  // processador permanece puro e testável.
  resolvedEvent: ResolvedProviderEvent | null
  isReplay: boolean
}

// Resultado do filtro de gatilho (MELHOR ESFORÇO, nunca barreira). Mismatch =>
// IGNORED com rastro; evento não resolvido => processa mesmo assim (fail-open).
function evaluateTriggerFilter(
  source: ProcessInput['source'],
  resolvedEvent: ResolvedProviderEvent | null,
): { mismatch: boolean; errorMessage: string | null } {
  const hasFilter =
    !!source.providerEvent && !!resolvedEvent && !resolvedEvent.noCatalog
  const eventResolved = resolvedEvent?.detectedEventId ?? null

  if (!hasFilter) return { mismatch: false, errorMessage: null }

  // Provedor mudou de formato e não conseguimos detectar o evento: NÃO filtrar.
  if (eventResolved === null) {
    console.warn({
      scope: 'webhook.trigger_filter',
      reason: 'event_unresolved_processing_anyway',
      webhookSourceId: source.id,
      organizationId: source.organizationId,
      platform: source.platform,
      configuredEvent: source.providerEvent,
    })
    return { mismatch: false, errorMessage: null }
  }

  if (eventResolved === source.providerEvent) {
    return { mismatch: false, errorMessage: null }
  }

  console.warn({
    scope: 'webhook.trigger_filter',
    reason: 'event_mismatch_ignored',
    webhookSourceId: source.id,
    organizationId: source.organizationId,
    platform: source.platform,
    configuredEvent: source.providerEvent,
    detectedEvent: eventResolved,
  })
  return {
    mismatch: true,
    errorMessage: `Evento recebido ("${eventResolved}") difere do gatilho configurado ("${source.providerEvent}") — ignorado`,
  }
}

// Executa o efeito no CRM de acordo com o eventType da fonte. Erros viram ERROR
// (preservando rastro no log), nunca derrubam o processamento.
async function runEffectHandler(
  source: ProcessInput['source'],
  resolved: Record<string, unknown>,
): Promise<ProcessResult> {
  try {
    switch (source.eventType) {
      case 'UPSERT_CONTACT':
        return await handleUpsertContact({
          orgId: source.organizationId,
          squadId: source.squadId,
          resolved,
        })
      // Legado: fontes criadas antes da migração para UPSERT_CONTACT
      case 'NEW_CONTACT':
        return await handleNewContact({
          orgId: source.organizationId,
          squadId: source.squadId,
          resolved,
        })
      case 'UPDATE_CONTACT':
        return await handleUpdateContact({
          orgId: source.organizationId,
          resolved,
        })
      case 'NEW_DEAL':
        return await handleNewDeal({
          orgId: source.organizationId,
          squadId: source.squadId,
          resolved,
        })
      case 'UPDATE_DEAL':
        return await handleUpdateDeal({
          orgId: source.organizationId,
          resolved,
        })
      case 'DEAL_CLOSED':
        return await handleDealClosed({
          orgId: source.organizationId,
          resolved,
        })
      default:
        return { status: 'IGNORED' }
    }
  } catch (error) {
    return {
      status: 'ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function processInboundWebhook(
  input: ProcessInput,
): Promise<{ id: string }> {
  const { source, payload, externalEventId, resolvedEvent } = input

  const resolved = resolveFieldMapping(source.fieldMapping, payload)

  // Filtro de gatilho — fail-open: roda ANTES do switch de efeito. PII (payload)
  // nunca entra nos console.* abaixo; só os IDs/metadados acima.
  const triggerFilter = evaluateTriggerFilter(source, resolvedEvent)

  let result: ProcessResult
  if (triggerFilter.mismatch) {
    result = {
      status: 'IGNORED',
      errorMessage: triggerFilter.errorMessage ?? undefined,
    }
  } else {
    result = await runEffectHandler(source, resolved)
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

  // Dispara automações de CONTACT_CREATED apenas quando o webhook criou um novo contato.
  // Fire-and-forget: falha aqui não compromete o log persistido acima.
  if (result.status === 'PROCESSED' && result.created && result.contactId) {
    try {
      await evaluateAutomations({
        subjectKind: 'contact',
        orgId: source.organizationId,
        triggerType: 'CONTACT_CREATED',
        contactId: result.contactId,
        payload: { source: CaptureChannel.API, lifecycleStage: 'LEAD' },
      })
    } catch {
      // swallow: o log é a fonte de verdade; automação é colateral
    }
  }

  return { id: log.id }
}
