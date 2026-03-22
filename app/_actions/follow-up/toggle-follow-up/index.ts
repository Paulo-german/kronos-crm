'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { toggleFollowUpSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const toggleFollowUp = orgActionClient
  .schema(toggleFollowUpSchema)
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

    // 3. Atualizar isActive
    await db.followUp.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    })

    // 4. Se desativando, limpar FUPs pendentes nas conversas do agente
    // A cadeia de follow-ups mudou, portanto resetamos o estado
    if (!data.isActive) {
      await db.conversation.updateMany({
        where: {
          inbox: { agentId: data.agentId },
          nextFollowUpAt: { not: null },
        },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
    }

    // 5. Invalidar cache
    revalidateTag(`follow-ups:${data.agentId}`)
    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })
