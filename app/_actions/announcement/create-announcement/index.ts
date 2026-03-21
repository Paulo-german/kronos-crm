'use server'

import { superAdminActionClient } from '@/_lib/safe-action'
import { createAnnouncementSchema } from './schema'
import { db } from '@/_lib/prisma'
import { createBulkNotifications } from '@/_lib/notifications/create-notification'

export const createAnnouncement = superAdminActionClient
  .schema(createAnnouncementSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Criar registro do comunicado (sem totalRecipients ainda — calculado após envio)
    const announcement = await db.announcement.create({
      data: {
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl ?? null,
        targetOrgIds: data.targetOrgIds,
        createdBy: ctx.userId,
        totalRecipients: 0,
      },
    })

    // 2. Resolver quais orgs receberão o comunicado
    let targetOrgIds: string[]

    if (data.targetOrgIds.length === 0) {
      // Sem escopo definido → enviar para TODAS as orgs com ao menos 1 membro ACCEPTED
      const orgs = await db.organization.findMany({
        where: {
          members: { some: { status: 'ACCEPTED' } },
        },
        select: { id: true },
      })
      targetOrgIds = orgs.map((org) => org.id)
    } else {
      targetOrgIds = data.targetOrgIds
    }

    // 3. Disparar notificações para cada org em paralelo (falhas individuais não bloqueiam o batch)
    const notificationResults = await Promise.allSettled(
      targetOrgIds.map((orgId) =>
        createBulkNotifications({
          orgId,
          type: 'PLATFORM_ANNOUNCEMENT',
          title: data.title,
          body: data.body,
          actionUrl: data.actionUrl,
        }),
      ),
    )

    // 4. Contar total de destinatários efetivamente notificados
    // Cada resultado bem-sucedido retorna um array de PromiseSettledResult do createBulkNotifications
    let totalRecipients = 0

    for (const result of notificationResults) {
      if (result.status === 'fulfilled') {
        // result.value é o array retornado por createBulkNotifications (um por membro)
        totalRecipients += result.value.length
      }
    }

    // 5. Atualizar o registro com a contagem real de destinatários
    await db.announcement.update({
      where: { id: announcement.id },
      data: { totalRecipients },
    })

    return { success: true, announcementId: announcement.id }
  })
