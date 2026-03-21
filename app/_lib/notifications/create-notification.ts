import 'server-only'
import { revalidateTag } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { NotificationType } from '@prisma/client'
import {
  notificationPreferencesSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from '@/_data-access/notification/types'

interface CreateNotificationInput {
  orgId: string
  userId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
  resourceType?: string
  resourceId?: string
}

// Mapeamento de tipo de notificacao para chave de preferencia
const TYPE_TO_PREFERENCE_KEY: Record<NotificationType, keyof NotificationPreferences['inApp']> = {
  SYSTEM: 'system',
  USER_ACTION: 'userAction',
  PLATFORM_ANNOUNCEMENT: 'platformAnnouncement',
}

const resolveUserPreferences = async (userId: string): Promise<NotificationPreferences> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  })

  if (!user?.notificationPreferences) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  const parsed = notificationPreferencesSchema.safeParse(user.notificationPreferences)
  if (!parsed.success) {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }

  return parsed.data
}

/**
 * Cria uma notificacao para um usuario especifico.
 * Verifica as preferencias do usuario antes de criar -- se o tipo estiver desativado, nao cria.
 * BACKEND-ONLY: chamado internamente por actions/triggers. NUNCA expor ao client.
 */
export async function createNotification(input: CreateNotificationInput) {
  const prefs = await resolveUserPreferences(input.userId)
  const preferenceKey = TYPE_TO_PREFERENCE_KEY[input.type]

  // Se o usuario desativou esse tipo de notificacao, aborta silenciosamente
  if (!prefs.inApp[preferenceKey]) {
    return null
  }

  const notification = await db.notification.create({
    data: {
      organizationId: input.orgId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      actionUrl: input.actionUrl ?? null,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
    },
  })

  // Invalidar cache do destinatario para refletir a nova notificacao
  revalidateTag(`notifications:${input.userId}`)

  return notification
}

/**
 * Cria notificacoes em massa para todos os membros ativos de uma org.
 * Usado principalmente para PLATFORM_ANNOUNCEMENT.
 * Respeita preferencias individuais de cada membro.
 */
export async function createBulkNotifications(input: {
  orgId: string
  type: NotificationType
  title: string
  body: string
  actionUrl?: string
}) {
  // Buscar todos membros ACCEPTED com userId valido
  const members = await db.member.findMany({
    where: {
      organizationId: input.orgId,
      status: 'ACCEPTED',
      userId: { not: null },
    },
    select: { userId: true },
  })

  // Criar notificacao para cada membro (respeitando preferencias individualmente)
  const results = await Promise.allSettled(
    members.map((member) =>
      createNotification({
        orgId: input.orgId,
        userId: member.userId!,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl,
      }),
    ),
  )

  return results
}
