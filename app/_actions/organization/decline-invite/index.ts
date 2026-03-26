'use server'

import { authActionClient } from '@/_lib/safe-action'
import { declineInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'

/**
 * Recusa um convite de organizacao pelo token.
 *
 * Nota sobre o enum MemberStatus: o Prisma so possui PENDING e ACCEPTED.
 * Nao existe DECLINED. Por isso, ao recusar, o registro Member e deletado
 * ao inves de atualizado — evita migration desnecessaria e manteia a tabela limpa.
 *
 * Usa authActionClient (nao orgActionClient) porque o usuario pode nao ser
 * membro da org no momento em que recusa o convite.
 */
export const declineInvite = authActionClient
  .schema(declineInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Buscar o convite pelo token (apenas PENDING)
    const member = await db.member.findUnique({
      where: {
        invitationToken: data.token,
        status: 'PENDING',
      },
      select: {
        id: true,
        email: true,
        organizationId: true,
      },
    })

    if (!member) {
      throw new Error('Convite inválido, expirado ou já respondido.')
    }

    // 2. Verificar que o e-mail do convite pertence ao usuário logado
    const user = await db.user.findUnique({
      where: { id: ctx.userId },
      select: { email: true },
    })

    if (!user) {
      throw new Error('Usuário não encontrado.')
    }

    if (member.email !== user.email) {
      throw new Error(
        `Este convite foi enviado para ${member.email}, mas você está logado como ${user.email}. Entre com a conta correta.`,
      )
    }

    // 3. Deletar o registro Member
    //    O enum MemberStatus nao possui DECLINED, entao deletamos o registro
    //    para manter a tabela limpa e liberar a quota de membros da org.
    await db.member.delete({
      where: { id: member.id },
    })

    // 4. Invalidar caches relevantes
    revalidateTag(`user-orgs:${ctx.userId}`) // Para o seletor de orgs
    revalidateTag(`org-members:${member.organizationId}`) // Para a lista de membros da org
    revalidateTag(`notifications:${ctx.userId}`) // Para marcar notificacoes relacionadas como stale

    return { success: true }
  })
