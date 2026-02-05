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

    // Não pode promover para OWNER (apenas transferência)
    if (role === 'OWNER') {
      throw new Error(
        'Não é possível promover para OWNER diretamente. Utilize a funcionalidade de transferência de propriedade.',
      )
    }

    // 4. Atualizar role
    await db.member.update({
      where: { id: memberId },
      data: { role },
    })

    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
