'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { reorderFollowUpsSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const reorderFollowUps = orgActionClient
  .schema(reorderFollowUpsSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER e ADMIN podem gerenciar agentes
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    // 2. Validar ownership: agente deve pertencer à ctx.orgId
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 3. Validar que todos os orderedIds pertencem ao agente
    const followUps = await db.followUp.findMany({
      where: { id: { in: data.orderedIds }, agentId: data.agentId },
      select: { id: true },
    })

    if (followUps.length !== data.orderedIds.length) {
      throw new Error('Um ou mais follow-ups informados não pertencem ao agente.')
    }

    // 4. Atualizar order de cada follow-up baseado na posição no array
    await db.$transaction(
      data.orderedIds.map((followUpId, index) =>
        db.followUp.update({
          where: { id: followUpId },
          data: { order: index },
        }),
      ),
    )

    // 5. Limpar follow-ups pendentes nas conversas (a cadeia mudou)
    await db.conversation.updateMany({
      where: {
        inbox: { agentId: data.agentId },
        nextFollowUpAt: { not: null },
      },
      data: { nextFollowUpAt: null, followUpCount: 0 },
    })

    // 6. Invalidar cache
    revalidateTag(`follow-ups:${data.agentId}`)
    revalidateTag(`conversations:${ctx.orgId}`)

    return { success: true }
  })
