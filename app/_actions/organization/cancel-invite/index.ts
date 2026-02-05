'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { cancelInviteSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const cancelInvite = orgActionClient
  .schema(cancelInviteSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 0. Verificar permissão (apenas ADMIN/OWNER podem cancelar convites)
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Buscar o convite pendente
    const member = await db.member.findUnique({
      where: {
        id: data.memberId,
        organizationId: ctx.orgId,
        status: 'PENDING',
      },
    })

    if (!member) {
      throw new Error('Convite não encontrado ou já foi aceito.')
    }

    // Deletar o convite
    await db.member.delete({
      where: { id: member.id },
    })

    revalidateTag(`org-members:${ctx.orgId}`)

    return { success: true }
  })
