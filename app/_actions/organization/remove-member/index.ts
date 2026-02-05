'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { removeMemberSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const removeMember = orgActionClient
  .schema(removeMemberSchema)
  .action(async ({ parsedInput: { memberId }, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // 2. Buscar membro
    const memberToRemove = await db.member.findUnique({
      where: {
        id: memberId,
        organizationId: ctx.orgId,
      },
    })

    if (!memberToRemove) {
      throw new Error('Membro não encontrado.')
    }

    // 3. Validações de segurança
    if (memberToRemove.userId === ctx.userId) {
      throw new Error(
        'Você não pode remover a si mesmo da organização por esta ação. Utilize a opção de sair da organização.',
      )
    }

    if (memberToRemove.role === 'OWNER') {
      throw new Error('O proprietário da organização não pode ser removido.')
    }

    // 4. Remover membro
    await db.member.delete({
      where: { id: memberId },
    })

    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
