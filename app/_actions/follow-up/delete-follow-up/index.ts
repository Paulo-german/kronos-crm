'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { deleteFollowUpSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const deleteFollowUp = orgActionClient
  .schema(deleteFollowUpSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER e ADMIN podem gerenciar agentes
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    // 2. Validar ownership: follow-up deve pertencer a um agente da ctx.orgId
    const followUp = await db.followUp.findFirst({
      where: {
        id: data.id,
        agentId: data.agentId,
        agent: { organizationId: ctx.orgId },
      },
      select: { id: true },
    })

    if (!followUp) {
      throw new Error('Follow-up não encontrado.')
    }

    // 3. Limpar follow-ups pendentes nas conversas do agente que tenham FUP agendado
    // A cadeia pode ter mudado após a deleção, então zeramos o estado
    await db.conversation.updateMany({
      where: {
        inbox: { agentId: data.agentId },
        nextFollowUpAt: { not: null },
      },
      data: { nextFollowUpAt: null, followUpCount: 0 },
    })

    // 4. Deletar follow-up — cascade remove os links automaticamente
    await db.followUp.delete({ where: { id: data.id } })

    // 5. Invalidar cache (inclui tag de contagem para quota e conversas afetadas)
    revalidateTag(`follow-ups:${data.agentId}`)
    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`follow-ups-org:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })
