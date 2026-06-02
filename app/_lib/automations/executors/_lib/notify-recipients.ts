import 'server-only'
import { db } from '@/_lib/prisma'
import { createNotification } from '@/_lib/notifications/create-notification'
import { resolveWhatsAppProvider } from '@/_lib/whatsapp/provider'
import { withRetry } from '@/_lib/whatsapp/retry'
import { normalizePhoneToJid } from '@/_lib/whatsapp/normalize-phone'
import type { NotifyChannel } from '../../types'

export interface DeliverNotificationParams {
  orgId: string
  recipientIds: string[]
  channels: NotifyChannel[]
  resolvedBody: string
  notificationTitle: string
  actionUrl?: string
  resourceType: string
  resourceId: string
}

export interface DeliveryResult {
  inApp: { sent: number; failed: number }
  whatsapp: { sent: number; failed: number; skipped: number }
}

/**
 * Entrega uma notificação para um conjunto de destinatários nos canais informados.
 * Compartilhado entre os executores de deal e de contato (DRY) para garantir paridade.
 * Resolve os usuários uma única vez para evitar N+1 entre os canais.
 */
export async function deliverNotification(params: DeliverNotificationParams): Promise<DeliveryResult> {
  const inApp = { sent: 0, failed: 0 }
  const whatsapp = { sent: 0, failed: 0, skipped: 0 }

  const recipients = await db.user.findMany({
    where: { id: { in: params.recipientIds } },
    select: { id: true, fullName: true, phone: true },
  })

  // ── Canal in-app ───────────────────────────────────────────
  if (params.channels.includes('in_app')) {
    const results = await Promise.allSettled(
      recipients.map((user) =>
        createNotification({
          orgId: params.orgId,
          userId: user.id,
          type: 'USER_ACTION',
          title: params.notificationTitle,
          body: params.resolvedBody,
          actionUrl: params.actionUrl,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
        }),
      ),
    )

    inApp.sent = results.filter((result) => result.status === 'fulfilled').length
    inApp.failed = results.filter((result) => result.status === 'rejected').length
  }

  // ── Canal WhatsApp ─────────────────────────────────────────
  if (params.channels.includes('whatsapp')) {
    // Pega o primeiro inbox WhatsApp ativo da org como remetente
    const inbox = await db.inbox.findFirst({
      where: {
        organizationId: params.orgId,
        isActive: true,
        channel: 'WHATSAPP',
      },
      select: {
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
      },
    })

    if (!inbox) {
      // Sem inbox WhatsApp configurado — todas as notificações WhatsApp são puladas
      whatsapp.skipped = recipients.length
    } else {
      const provider = resolveWhatsAppProvider(inbox)

      const results = await Promise.allSettled(
        recipients.map(async (user) => {
          const jid = normalizePhoneToJid(user.phone)
          if (!jid) {
            return { skipped: true as const }
          }
          await withRetry(() => provider.sendText(jid, params.resolvedBody))
          return { skipped: false as const }
        }),
      )

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            whatsapp.skipped += 1
          } else {
            whatsapp.sent += 1
          }
        } else {
          whatsapp.failed += 1
        }
      }
    }
  }

  return { inApp, whatsapp }
}
