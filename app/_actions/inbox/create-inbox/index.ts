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

    // 4. Criar inbox
    const inbox = await db.inbox.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        channel: data.channel,
        isActive: true,
        agentId: data.agentId ?? null,
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
