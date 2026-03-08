'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createAgentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { pickDefined, OPTIONAL_AGENT_FIELDS } from '../shared/pick-defined'

export const createAgent = orgActionClient
  .schema(createAgentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'create'))

    await requireQuota(ctx.orgId, 'agent')

    const agent = await db.agent.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        systemPrompt: data.systemPrompt ?? '',
        promptConfig: data.promptConfig,
        ...pickDefined(data, [...OPTIONAL_AGENT_FIELDS]),
      },
    })

    revalidateTag(`agents:${ctx.orgId}`)

    const quota = await checkPlanQuota(ctx.orgId, 'agent')

    return { success: true, agentId: agent.id, current: quota.current, limit: quota.limit }
  })
