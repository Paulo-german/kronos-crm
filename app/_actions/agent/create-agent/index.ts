'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { createAgentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission, requireQuota } from '@/_lib/rbac'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'

export const createAgent = orgActionClient
  .schema(createAgentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'create'))

    await requireQuota(ctx.orgId, 'agent')

    const agent = await db.agent.create({
      data: {
        organizationId: ctx.orgId,
        name: data.name,
        systemPrompt: data.systemPrompt,
        ...(data.modelId !== undefined && { modelId: data.modelId }),
        ...(data.debounceSeconds !== undefined && {
          debounceSeconds: data.debounceSeconds,
        }),
        ...(data.pipelineIds !== undefined && { pipelineIds: data.pipelineIds }),
        ...(data.toolsEnabled !== undefined && {
          toolsEnabled: data.toolsEnabled,
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.businessHoursEnabled !== undefined && {
          businessHoursEnabled: data.businessHoursEnabled,
        }),
        ...(data.businessHoursTimezone !== undefined && {
          businessHoursTimezone: data.businessHoursTimezone,
        }),
        ...(data.businessHoursConfig !== undefined && {
          businessHoursConfig: data.businessHoursConfig,
        }),
        ...(data.outOfHoursMessage !== undefined && {
          outOfHoursMessage: data.outOfHoursMessage,
        }),
      },
    })

    revalidateTag(`agents:${ctx.orgId}`)

    const quota = await checkPlanQuota(ctx.orgId, 'agent')

    return { success: true, agentId: agent.id, current: quota.current, limit: quota.limit }
  })
