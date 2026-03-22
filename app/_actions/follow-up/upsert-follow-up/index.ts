'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { upsertFollowUpSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { requireQuota } from '@/_lib/rbac/plan-limits'

export const upsertFollowUp = orgActionClient
  .schema(upsertFollowUpSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER e ADMIN podem gerenciar agentes
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    // 2. Quota: verificar limite do plano apenas no create (não no update)
    if (!data.id) {
      await requireQuota(ctx.orgId, 'follow_up')
    }

    // 3. Validar ownership: agente deve pertencer à ctx.orgId
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 4. Validação cross-entity: todos os agentStepIds devem pertencer ao agente
    const validSteps = await db.agentStep.findMany({
      where: { id: { in: data.agentStepIds }, agentId: data.agentId },
      select: { id: true },
    })

    if (validSteps.length !== data.agentStepIds.length) {
      throw new Error('Uma ou mais etapas informadas não pertencem ao agente.')
    }

    // 5. Operação no banco — estratégia replace-all para links
    if (data.id) {
      // UPDATE: validar ownership do follow-up antes de modificar
      const existingFollowUp = await db.followUp.findFirst({
        where: { id: data.id, agentId: data.agentId },
        select: { id: true },
      })

      if (!existingFollowUp) {
        throw new Error('Follow-up não encontrado.')
      }

      await db.$transaction(async (tx) => {
        // Atualizar campos básicos do follow-up
        await tx.followUp.update({
          where: { id: data.id },
          data: {
            delayMinutes: data.delayMinutes,
            messageContent: data.messageContent,
            isActive: data.isActive,
          },
        })

        // Replace-all: deletar e recriar links de agentSteps
        await tx.followUpAgentStep.deleteMany({ where: { followUpId: data.id } })
        await tx.followUpAgentStep.createMany({
          data: data.agentStepIds.map((agentStepId) => ({
            followUpId: data.id!,
            agentStepId,
          })),
        })
      })

      // 6. Invalidar cache
      revalidateTag(`follow-ups:${data.agentId}`)
      revalidateTag(`agent:${data.agentId}`)

      return { success: true, followUpId: data.id }
    }

    // CREATE: calcular order automaticamente (max order do agente + 1)
    const maxOrderResult = await db.followUp.findFirst({
      where: { agentId: data.agentId },
      select: { order: true },
      orderBy: { order: 'desc' },
    })

    const nextOrder = maxOrderResult ? maxOrderResult.order + 1 : 0

    const followUp = await db.$transaction(async (tx) => {
      const newFollowUp = await tx.followUp.create({
        data: {
          agentId: data.agentId,
          organizationId: ctx.orgId,
          delayMinutes: data.delayMinutes,
          messageContent: data.messageContent,
          isActive: data.isActive,
          order: data.order ?? nextOrder,
        },
        select: { id: true },
      })

      await tx.followUpAgentStep.createMany({
        data: data.agentStepIds.map((agentStepId) => ({
          followUpId: newFollowUp.id,
          agentStepId,
        })),
      })

      return newFollowUp
    })

    // 6. Invalidar cache (inclui tag de contagem para quota)
    revalidateTag(`follow-ups:${data.agentId}`)
    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`follow-ups-org:${ctx.orgId}`)

    return { success: true, followUpId: followUp.id }
  })
