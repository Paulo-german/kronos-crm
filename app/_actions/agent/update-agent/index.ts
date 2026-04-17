'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateAgentSchema } from './schema'
import { Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { pickDefined, OPTIONAL_AGENT_FIELDS } from '../shared/pick-defined'

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
        ...(data.promptConfig !== undefined && {
          promptConfig: data.promptConfig === null ? Prisma.DbNull : data.promptConfig,
        }),
        ...pickDefined(data, [...OPTIONAL_AGENT_FIELDS, 'agentVersion'] as const),
      },
    })

    revalidateTag(`agents:${ctx.orgId}`)
    revalidateTag(`agent:${data.id}`)
    revalidateTag(`agentGroups:${ctx.orgId}`)

    return { success: true }
  })
