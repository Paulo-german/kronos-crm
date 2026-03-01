'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateAgentSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateAgent = orgActionClient
  .schema(updateAgentSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const existingAgent = await db.agent.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
    })

    if (!existingAgent) {
      throw new Error('Agente não encontrado.')
    }

    await db.agent.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.systemPrompt !== undefined && {
          systemPrompt: data.systemPrompt,
        }),
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
    revalidateTag(`agent:${data.id}`)

    return { success: true }
  })
