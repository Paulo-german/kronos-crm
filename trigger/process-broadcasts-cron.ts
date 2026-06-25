import {
  schedules,
  logger,
  metadata as triggerMetadata,
} from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { normalizePhoneToDigits } from '@/_lib/whatsapp/normalize-phone'
import { revalidateTags } from './tools/lib/revalidate-tags'
import type { MetaTemplateSendComponent } from '@/_lib/meta/types'

// Quantos recipients enviar por execução. Com throttle de 1.5s, 40 mensagens
// levam ~60s — cabe folgado no maxDuration e mantém o tick responsivo.
const CHUNK_SIZE = 40

// Teto de tempo de uma execução. Mesmo que o chunk seja grande ou o throttle
// alto, interrompe o loop antes do maxDuration para o próximo tick continuar.
const RUN_BUDGET_MS = 240_000

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

// Linha retornada por claim_recipients (SETOF broadcast_recipients → snake_case)
interface ClaimedRecipientRow {
  id: string
  phone_snapshot: string
}

// Monta os components do template Meta a partir dos params fixos (v1: só corpo).
// Variável de cabeçalho é bloqueada na UI, então não há component 'header' aqui.
function buildTemplateComponents(
  params: string[] | null,
): MetaTemplateSendComponent[] | undefined {
  if (!params || params.length === 0) return undefined
  return [
    {
      type: 'body',
      parameters: params.map((text) => ({ type: 'text' as const, text })),
    },
  ]
}

// Campos da inbox necessários para resolver o provider de envio.
const INBOX_PROVIDER_SELECT = {
  id: true,
  isActive: true,
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

// ---------------------------------------------------------------------------
// Cron principal — motor de disparo de broadcasts (Prospection)
// ---------------------------------------------------------------------------

// A cada minuto. concurrencyLimit 1 garante que dois ticks não processem o
// mesmo broadcast em paralelo; a proteção fina contra corrida fica no
// claim_recipients (UPDATE ... FOR UPDATE SKIP LOCKED).
export const processBroadcastsCron = schedules.task({
  id: 'process-broadcasts-cron',
  cron: '* * * * *',
  queue: { concurrencyLimit: 1 },
  maxDuration: 300,
  run: async () => {
    const now = new Date()

    // 1. Promover agendados cuja janela já passou (SCHEDULED → RUNNING) e
    //    recuperar recipients travados em SENDING (crash entre claim e envio).
    await db.$executeRawUnsafe('SELECT promote_scheduled_broadcasts()')
    await db.$executeRawUnsafe('SELECT recover_stuck_sending_recipients()')

    // 2. Finalizar broadcasts RUNNING sem nenhum recipient PENDING/SENDING.
    //    Cobre o tick seguinte ao último chunk e o caso "tudo SKIPPED na criação".
    const finalized = await db.broadcast.updateMany({
      where: {
        status: 'RUNNING',
        recipients: { none: { status: { in: ['PENDING', 'SENDING'] } } },
      },
      data: { status: 'COMPLETED', completedAt: now },
    })

    // 3. Pegar o próximo broadcast RUNNING com recipients PENDING (FIFO).
    const broadcast = await db.broadcast.findFirst({
      where: { status: 'RUNNING', recipients: { some: { status: 'PENDING' } } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        organizationId: true,
        connectionType: true,
        messageContent: true,
        templateName: true,
        templateLanguage: true,
        templateParams: true,
        throttleMs: true,
        inbox: { select: INBOX_PROVIDER_SELECT },
      },
    })

    if (!broadcast) {
      triggerMetadata.set('finalized', finalized.count)
      return { processed: 0, sent: 0, failed: 0, finalized: finalized.count }
    }

    // 4. Claim atômico de um chunk de PENDING → SENDING.
    const claimed = await db.$queryRawUnsafe<ClaimedRecipientRow[]>(
      'SELECT * FROM claim_recipients($1, $2)',
      broadcast.id,
      CHUNK_SIZE,
    )

    if (claimed.length === 0) {
      // Outro tick já levou os PENDING deste broadcast — nada a fazer.
      return { processed: 0, sent: 0, failed: 0, finalized: finalized.count }
    }

    const log = (
      outcome: 'INFO' | 'ERROR',
      message: string,
      extra?: Record<string, unknown>,
    ) =>
      logger[outcome === 'ERROR' ? 'error' : 'info'](
        `[broadcasts] ${message}`,
        {
          broadcastId: broadcast.id,
          organizationId: broadcast.organizationId,
          ...extra,
        },
      )

    // 5. Resolver o provider uma vez. Falha de credenciais/inbox inativa é
    //    terminal para o broadcast inteiro: marca TODOS os recipients restantes
    //    (chunk reivindicado + demais PENDING) como FAILED e o broadcast FAILED,
    //    mantendo os contadores consistentes.
    const failBroadcast = async (reason: string) => {
      const failedRecipients = await db.broadcastRecipient.updateMany({
        where: {
          broadcastId: broadcast.id,
          status: { in: ['PENDING', 'SENDING'] },
        },
        data: { status: 'FAILED', errorMessage: reason.slice(0, 500) },
      })
      await db.$executeRawUnsafe(
        'SELECT increment_broadcast_counts($1, $2, $3)',
        broadcast.id,
        0,
        failedRecipients.count,
      )
      await db.broadcast.update({
        where: { id: broadcast.id },
        data: { status: 'FAILED', completedAt: new Date() },
      })
      await revalidateTags([`broadcasts:${broadcast.organizationId}`])
      log('ERROR', 'broadcast_failed', {
        reason,
        failed: failedRecipients.count,
      })
    }

    if (!broadcast.inbox.isActive) {
      await failBroadcast('A caixa de entrada do disparo está inativa.')
      return { processed: claimed.length, sent: 0, failed: claimed.length }
    }

    let provider
    try {
      provider = resolveWhatsAppProvider(broadcast.inbox)
    } catch (providerError) {
      await failBroadcast(
        providerError instanceof Error
          ? providerError.message
          : String(providerError),
      )
      return { processed: claimed.length, sent: 0, failed: claimed.length }
    }

    // 6. Enviar sequencialmente com throttle entre mensagens.
    const isMetaCloud = broadcast.connectionType === 'META_CLOUD'
    const templateComponents = buildTemplateComponents(
      Array.isArray(broadcast.templateParams)
        ? (broadcast.templateParams as string[])
        : null,
    )

    let sent = 0
    let failed = 0
    const startMs = Date.now()

    for (let index = 0; index < claimed.length; index++) {
      const recipient = claimed[index]

      try {
        // phoneSnapshot é E164 com `+`; os providers esperam dígitos sem `+`
        // (mesmo padrão de consumo do remoteJid). Converte antes de enviar.
        const recipientPhone = normalizePhoneToDigits(recipient.phone_snapshot)
        if (!recipientPhone) {
          throw new Error('Telefone do destinatário é inválido.')
        }

        let providerMessageId: string | null

        if (isMetaCloud) {
          providerMessageId = await provider.sendTemplate(
            recipientPhone,
            broadcast.templateName ?? '',
            broadcast.templateLanguage ?? 'pt_BR',
            templateComponents,
          )
        } else {
          const sentIds = await provider.sendText(
            recipientPhone,
            broadcast.messageContent ?? '',
          )
          providerMessageId = sentIds[0] ?? null
        }

        await db.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId,
            attempts: { increment: 1 },
          },
        })
        sent++
      } catch (sendError) {
        await db.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            errorMessage: (sendError instanceof Error
              ? sendError.message
              : String(sendError)
            ).slice(0, 500),
            attempts: { increment: 1 },
          },
        })
        failed++
      }

      // Throttle entre mensagens (não após a última do chunk) e respeito ao
      // orçamento de tempo da execução.
      const isLast = index === claimed.length - 1
      if (isLast) break
      if (Date.now() - startMs > RUN_BUDGET_MS) break
      if (broadcast.throttleMs > 0) await sleep(broadcast.throttleMs)
    }

    // 7. Atualizar contadores denormalizados (atômico).
    await db.$executeRawUnsafe(
      'SELECT increment_broadcast_counts($1, $2, $3)',
      broadcast.id,
      sent,
      failed,
    )

    // 8. Finalizar o broadcast se não restou nada pendente/enviando.
    const remaining = await db.broadcastRecipient.count({
      where: {
        broadcastId: broadcast.id,
        status: { in: ['PENDING', 'SENDING'] },
      },
    })
    if (remaining === 0) {
      await db.broadcast.update({
        where: { id: broadcast.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })
    }

    // 9. Revalidar cache da listagem/detalhe de broadcasts.
    await revalidateTags([`broadcasts:${broadcast.organizationId}`])

    triggerMetadata.set('sent', sent)
    triggerMetadata.set('failed', failed)
    log('INFO', 'chunk_processed', {
      sent,
      failed,
      chunkSize: claimed.length,
      remaining,
      completed: remaining === 0,
    })

    return {
      processed: claimed.length,
      sent,
      failed,
      finalized: finalized.count,
      remaining,
    }
  },
})
