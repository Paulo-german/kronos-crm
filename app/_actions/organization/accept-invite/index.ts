'use server'

import { authActionClient } from '@/_lib/safe-action'
import { acceptInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

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

    // 3. Aceitar convite
    await db.member.update({
      where: { id: member.id },
      data: {
        status: 'ACCEPTED',
        userId: ctx.userId,
        invitationToken: null, // Limpar token para não ser reutilizado
      },
    })

    // Invalidar caches relevantes
    revalidateTag(`user-orgs:${ctx.userId}`) // Para aparecer no seletor de orgs
    revalidateTag(`org-members:${member.organizationId}`) // Para atualizar lista de membros

    return { success: true, orgSlug: member.organization.slug }
  })
