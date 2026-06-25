import {
  task,
  wait,
  logger,
  metadata as triggerMetadata,
} from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { checkBusinessHours } from '@/_lib/agent/check-business-hours'
import { getNextOpeningTime } from '@/_lib/agent/next-opening-time'
import { revalidateTags } from './tools/lib/revalidate-tags'
import {
  INBOX_PROVIDER_SELECT,
  sendBroadcastMessage,
} from './lib/broadcast-send'
import { promoteNextQueuedForInbox } from './lib/broadcast-queue'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'

// Teto defensivo de iterações (envios + esperas de janela). Maior que o limite de
// recipients (5000) com folga para iterações de janela fechada.
const SAFETY_CAP = 50_000

// Linha de claim_recipients (SETOF broadcast_recipients → snake_case)
interface ClaimedRecipientRow {
  id: string
  phone_snapshot: string
}

interface ProcessBroadcastPayload {
  broadcastId: string
}

// ---------------------------------------------------------------------------
// Motor durável — uma execução por disparo (Prospection)
// ---------------------------------------------------------------------------
//
// Em vez de um cron varrendo chunks, cada broadcast é uma run própria que vive
// até a lista acabar. Entre mensagens dorme com wait.for (throttle real, custo
// zero); fora da janela de envio dorme com wait.until até a próxima abertura.
// Os waits fazem checkpoint no Trigger.dev — não consomem compute.
//
// Serialização por número: a run é disparada com concurrencyKey = inboxId, e a
// app só dispara o próximo QUEUED da inbox quando o atual termina.
export const processBroadcast = task({
  id: 'process-broadcast',
  queue: { concurrencyLimit: 1 },
  run: async ({ broadcastId }: ProcessBroadcastPayload) => {
    // Carrega o disparo + credenciais da inbox uma vez (são imutáveis no envio).
    const bc = await db.broadcast.findUnique({
      where: { id: broadcastId },
      select: {
        id: true,
        organizationId: true,
        status: true,
        connectionType: true,
        messageContent: true,
        templateName: true,
        templateLanguage: true,
        templateParams: true,
        throttleMs: true,
        sendingWindowEnabled: true,
        sendingWindowConfig: true,
        sendingWindowTimezone: true,
        inbox: { select: INBOX_PROVIDER_SELECT },
      },
    })

    if (!bc) return { processed: 0, reason: 'not_found' }
    if (bc.status !== 'RUNNING') return { processed: 0, reason: 'not_running' }

    const inboxId = bc.inbox.id
    const orgId = bc.organizationId
    const throttleSeconds = Math.max(1, Math.ceil(bc.throttleMs / 1000))
    const windowConfig =
      bc.sendingWindowEnabled && bc.sendingWindowConfig
        ? (bc.sendingWindowConfig as unknown as BusinessHoursConfig)
        : null

    const log = (message: string, extra?: Record<string, unknown>) =>
      logger.info(`[broadcast] ${message}`, { broadcastId, orgId, ...extra })

    const revalidate = () =>
      revalidateTags([`broadcasts:${orgId}`, `broadcast:${broadcastId}`])

    // Finaliza o disparo (lista acabou ou falha terminal) e libera a inbox.
    const finish = async (status: 'COMPLETED' | 'FAILED', reason?: string) => {
      if (status === 'FAILED') {
        const failed = await db.broadcastRecipient.updateMany({
          where: { broadcastId, status: { in: ['PENDING', 'SENDING'] } },
          data: { status: 'FAILED', errorMessage: reason?.slice(0, 500) },
        })
        if (failed.count > 0) {
          await db.$executeRawUnsafe(
            'SELECT increment_broadcast_counts($1, $2, $3)',
            broadcastId,
            0,
            failed.count,
          )
        }
      }
      await db.broadcast.update({
        where: { id: broadcastId },
        data: {
          status,
          completedAt: new Date(),
          nextSendAt: null,
        },
      })
      await revalidate()
      await promoteNextQueuedForInbox(inboxId)
    }

    // Inbox inválida → falha terminal do disparo inteiro.
    if (!bc.inbox.isActive) {
      await finish('FAILED', 'A caixa de entrada do disparo está inativa.')
      return { processed: 0, reason: 'inbox_inactive' }
    }

    let provider
    try {
      provider = resolveWhatsAppProvider(bc.inbox)
    } catch (providerError) {
      await finish(
        'FAILED',
        providerError instanceof Error
          ? providerError.message
          : String(providerError),
      )
      return { processed: 0, reason: 'provider_error' }
    }

    let sent = 0
    let failed = 0

    for (let iteration = 0; iteration < SAFETY_CAP; iteration++) {
      // 1. Releitura leve de status — captura cancelamento entre os waits.
      const fresh = await db.broadcast.findUnique({
        where: { id: broadcastId },
        select: { status: true },
      })
      if (!fresh || fresh.status !== 'RUNNING') {
        log('stopped', { status: fresh?.status ?? 'deleted', sent, failed })
        return { processed: sent + failed, sent, failed, reason: 'stopped' }
      }

      // 2. Janela de envio: fora dela, dorme até a próxima abertura.
      if (windowConfig) {
        const tz = bc.sendingWindowTimezone
        if (!checkBusinessHours(tz, windowConfig)) {
          const nextOpen = getNextOpeningTime(tz, windowConfig)
          await db.broadcast.update({
            where: { id: broadcastId },
            data: { nextSendAt: nextOpen },
          })
          await revalidate()
          log('waiting_window', { nextOpen: nextOpen.toISOString() })
          await wait.until({ date: nextOpen })
          continue
        }
      }

      // 3. Claim atômico de 1 recipient PENDING → SENDING.
      const claimed = await db.$queryRawUnsafe<ClaimedRecipientRow[]>(
        'SELECT * FROM claim_recipients($1, $2)',
        broadcastId,
        1,
      )

      // 4. Sem mais pendentes → lista finalizada.
      if (claimed.length === 0) {
        await finish('COMPLETED')
        triggerMetadata.set('sent', sent)
        triggerMetadata.set('failed', failed)
        log('completed', { sent, failed })
        return { processed: sent + failed, sent, failed, reason: 'completed' }
      }

      // 5. Enviar e registrar o resultado do recipient.
      const recipient = claimed[0]
      const result = await sendBroadcastMessage(
        provider,
        bc,
        recipient.phone_snapshot,
      )

      if (result.ok) {
        await db.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId: result.providerMessageId,
            attempts: { increment: 1 },
          },
        })
        sent++
      } else {
        await db.broadcastRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'FAILED',
            errorMessage: result.error,
            attempts: { increment: 1 },
          },
        })
        failed++
      }

      await db.$executeRawUnsafe(
        'SELECT increment_broadcast_counts($1, $2, $3)',
        broadcastId,
        result.ok ? 1 : 0,
        result.ok ? 0 : 1,
      )

      // 6. Throttle entre números — wait durável, custo zero.
      const nextSendAt = new Date(Date.now() + throttleSeconds * 1000)
      await db.broadcast.update({
        where: { id: broadcastId },
        data: { nextSendAt },
      })
      await revalidate()
      await wait.for({ seconds: throttleSeconds })
    }

    // Atingiu o teto defensivo — não deveria acontecer; deixa para o watchdog.
    log('safety_cap_reached', { sent, failed })
    return { processed: sent + failed, sent, failed, reason: 'safety_cap' }
  },
})
