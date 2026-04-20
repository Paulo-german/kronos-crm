import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotifyNoCreditsInput {
  organizationId: string
  estimatedCost: number
}

interface NotifyNoCreditsResult {
  notified: boolean
  skippedReason?: 'recent_notification_exists' | 'no_admins'
  recipientCount: number
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NOTIFICATION_DEBOUNCE_MS = 24 * 60 * 60 * 1000 // 24h
const NOTIFICATION_TITLE = 'Créditos de IA esgotados'
const NOTIFICATION_BODY =
  'Seus créditos de IA acabaram. Recarregue para continuar usando o agente.'

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Notifica os admins/owners da org quando os créditos de IA estão esgotados.
 *
 * Debounce de 24h por org — evita spam por cada mensagem que chega sem saldo.
 * Verifica se já existe notificação não lida com o mesmo título nas últimas 24h.
 */
export async function notifyNoCredits(
  input: NotifyNoCreditsInput,
): Promise<NotifyNoCreditsResult> {
  const { organizationId, estimatedCost } = input

  // Debounce: só notificar se não há notificação não lida do mesmo tipo nas últimas 24h
  const recentCreditNotification = await db.notification.findFirst({
    where: {
      organizationId,
      type: 'SYSTEM',
      title: NOTIFICATION_TITLE,
      readAt: null,
      createdAt: { gte: new Date(Date.now() - NOTIFICATION_DEBOUNCE_MS) },
    },
  })

  if (recentCreditNotification) {
    logger.info('no-credits notification', {
      organizationId,
      notified: false,
      recipientCount: 0,
      skippedReason: 'recent_notification_exists',
    })
    return {
      notified: false,
      skippedReason: 'recent_notification_exists',
      recipientCount: 0,
    }
  }

  const [orgAdmins, organization] = await Promise.all([
    db.member.findMany({
      where: {
        organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
        status: 'ACCEPTED',
        userId: { not: null },
      },
      select: { userId: true },
    }),
    db.organization.findUnique({
      where: { id: organizationId },
      select: { slug: true },
    }),
  ])

  if (orgAdmins.length === 0) {
    logger.info('no-credits notification', {
      organizationId,
      notified: false,
      recipientCount: 0,
      skippedReason: 'no_admins',
    })
    return {
      notified: false,
      skippedReason: 'no_admins',
      recipientCount: 0,
    }
  }

  const actionUrl = organization
    ? `/org/${organization.slug}/settings/billing`
    : null

  // Criar notificações sem await — fire-and-forget para não bloquear o fluxo principal
  for (const admin of orgAdmins) {
    if (!admin.userId) continue

    void db.notification.create({
      data: {
        organizationId,
        userId: admin.userId,
        type: 'SYSTEM',
        title: NOTIFICATION_TITLE,
        body: NOTIFICATION_BODY,
        actionUrl,
        resourceType: 'credit',
        resourceId: null,
      },
    })
  }

  const recipientCount = orgAdmins.filter((admin) => admin.userId !== null).length

  logger.info('no-credits notification', {
    organizationId,
    notified: true,
    recipientCount,
    estimatedCost,
  })

  return { notified: true, recipientCount }
}
