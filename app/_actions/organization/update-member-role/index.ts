'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateMemberRoleSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateMemberRole = orgActionClient
  .schema(updateMemberRoleSchema)
  .action(async ({ parsedInput: { memberId, role }, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // 2. Buscar membro
    const member = await db.member.findUnique({
      where: {
        id: memberId,
        organizationId: ctx.orgId,
      },
      select: {
        id: true,
        userId: true,
        role: true,
      },
    })

    if (!member) {
      throw new Error('Membro não encontrado.')
    }

    // 3. Validações de segurança

    // Não pode alterar o próprio papel
    if (member.userId === ctx.userId) {
      throw new Error('Você não pode alterar seu próprio papel.')
    }

    // Não pode alterar role de um OWNER
    if (member.role === 'OWNER') {
      throw new Error(
        'Não é possível alterar o papel do proprietário. Transfira a propriedade se necessário.',
      )
    }

    // Não pode alterar role de um agente de SUPPORT — somente via remoção e novo convite
    if (member.role === 'SUPPORT') {
      throw new Error(
        'Não é possível alterar o papel de um agente de suporte. Revogue o acesso e convide novamente se necessário.',
      )
    }

    // 4. Atualizar role
    await db.member.update({
      where: { id: memberId },
      data: { role },
    })

    // Invalidar cache de membership do usuário alvo (role cacheado em validate-membership)
    if (member.userId) {
      revalidateTag(`membership:${member.userId}:${ctx.orgSlug}`)
    }
    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
