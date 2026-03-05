'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createInboxSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { requireQuota, checkPlanQuota } from '@/_lib/rbac/plan-limits'

export const createInbox = orgActionClient
  .schema(createInboxSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'create'))

    // 2. Quota
    await requireQuota(ctx.orgId, 'inbox')

    // 3. Se agentId fornecido, validar que pertence à org
    if (data.agentId) {
      const agent = await db.agent.findFirst({
        where: { id: data.agentId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!agent) {
        throw new Error('Agente não encontrado ou não pertence à organização.')
      }
    }

    // 3b. Se pipelineId fornecido, validar que pertence à org
    if (data.pipelineId) {
      const pipeline = await db.pipeline.findFirst({
        where: { id: data.pipelineId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!pipeline) {
        throw new Error('Pipeline não encontrado ou não pertence à organização.')
      }
    }

    // 3c. Se distributionUserIds fornecido, validar que são membros da org
    if (data.distributionUserIds && data.distributionUserIds.length > 0) {
      const validMembers = await db.member.findMany({
        where: {
          organizationId: ctx.orgId,
          userId: { in: data.distributionUserIds },
          status: 'ACCEPTED',
        },
        select: { userId: true },
      })

      const validUserIds = new Set(validMembers.map((member) => member.userId))
      const invalidIds = data.distributionUserIds.filter((id) => !validUserIds.has(id))

      if (invalidIds.length > 0) {
        throw new Error('Um ou mais membros selecionados não pertencem à organização.')
      }
    }

    // 4. Criar inbox
    const inbox = await db.inbox.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        channel: data.channel,
        isActive: true,
        agentId: data.agentId ?? null,
        ...(data.autoCreateDeal !== undefined && { autoCreateDeal: data.autoCreateDeal }),
        ...(data.pipelineId !== undefined && { pipelineId: data.pipelineId }),
        ...(data.distributionUserIds !== undefined && { distributionUserIds: data.distributionUserIds }),
      },
    })

    // 5. Invalidar cache
    revalidateTag(`inboxes:${ctx.orgId}`)
    if (data.agentId) {
      revalidateTag(`agent:${data.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    const quota = await checkPlanQuota(ctx.orgId, 'inbox')

    return {
      success: true,
      inboxId: inbox.id,
      current: quota.current,
      limit: quota.limit,
    }
  })
