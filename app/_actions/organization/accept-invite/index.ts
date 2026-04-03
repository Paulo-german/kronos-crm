'use server'

import { authActionClient } from '@/_lib/safe-action'
import { acceptInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { scheduleNotification } from '@/_lib/notifications/create-notification'

export const acceptInvite = authActionClient
  .schema(acceptInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Buscar convite pelo token e incluir dados da organização (para retornar slug)
    const member = await db.member.findUnique({
      where: {
        invitationToken: data.token,
        status: 'PENDING',
      },
      include: {
        organization: {
          select: {
            slug: true,
          },
        },
      },
    })

    if (!member) {
      throw new Error('Convite inválido ou expirado.')
    }

    // 1.1 Verificar expiração (7 dias)
    const INVITE_EXPIRATION_DAYS = 7
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() - INVITE_EXPIRATION_DAYS)

    if (member.updatedAt < expirationDate) {
      throw new Error(
        'Este convite expirou. Peça um novo convite ao administrador.',
      )
    }

    // 2. Verificar e-mail do usuário logado
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado.')
    }

    // O e-mail do convite DEVE ser igual ao e-mail logado
    if (member.email !== user.email) {
      throw new Error(
        `Este convite foi enviado para ${member.email}, mas você está logado como ${user.email}. Entre com a conta correta.`,
      )
    }

    // 3. Aceitar convite (mantém invitationToken para que a page possa
    //    detectar que já foi aceito e redirecionar ao invés de mostrar erro)
    await db.member.update({
      where: { id: member.id },
      data: {
        status: 'ACCEPTED',
        userId: ctx.userId,
      },
    })

    // Invalidar caches relevantes
    revalidateTag(`user-orgs:${ctx.userId}`) // Para aparecer no seletor de orgs
    revalidateTag(`org-members:${member.organizationId}`) // Para atualizar lista de membros

    // Notificar OWNERs e ADMINs da org sobre o novo membro
    const orgSlug = member.organization.slug
    const admins = await db.member.findMany({
      where: {
        organizationId: member.organizationId,
        status: 'ACCEPTED',
        role: { in: ['OWNER', 'ADMIN'] },
        userId: { not: null },
      },
      select: { userId: true },
    })

    for (const admin of admins) {
      const adminUserId = admin.userId
      if (!adminUserId) continue
      scheduleNotification({
        orgId: member.organizationId,
        userId: adminUserId,
        type: 'USER_ACTION',
        title: 'Novo membro na equipe',
        body: `${member.email} aceitou o convite e entrou na equipe.`,
        actionUrl: `/org/${orgSlug}/settings/members`,
        resourceType: 'member',
        resourceId: member.id,
      })
    }

    return { success: true, orgSlug }
  })
