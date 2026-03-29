'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateAgentGroupSchema } from './schema'

export const updateAgentGroup = orgActionClient
  .schema(updateAgentGroupSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agentGroup', 'update'))

    const { groupId, ...fields } = data

    const group = await db.agentGroup.findFirst({
      where: { id: groupId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!group) {
      throw new Error('Equipe de agentes não encontrada.')
    }

    await db.agentGroup.update({
      where: { id: groupId },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.description !== undefined && { description: fields.description }),
        ...(fields.isActive !== undefined && { isActive: fields.isActive }),
        ...(fields.routerModelId !== undefined && { routerModelId: fields.routerModelId }),
        // routerPrompt pode ser explicitamente nulo para limpar o campo
        ...(fields.routerPrompt !== undefined && { routerPrompt: fields.routerPrompt }),
        ...(fields.routerConfig !== undefined && { routerConfig: fields.routerConfig ?? undefined }),
      },
    })

    revalidateTag(`agentGroups:${ctx.orgId}`)
    revalidateTag(`agentGroup:${groupId}`)

    return { success: true }
  })
