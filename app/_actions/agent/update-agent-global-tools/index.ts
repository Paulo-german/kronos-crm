'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resolveCanonicalAgentVersion } from '@/_lib/agent/agent-version'
import { updateAgentGlobalToolsSchema } from './schema'
import { normalizeToolIds } from '../shared/normalize-tool-ids'

export const updateAgentGlobalTools = orgActionClient
  .schema(updateAgentGlobalToolsSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    const agent = await db.agent.findFirst({
      where: { id: parsedInput.agentId, organizationId: ctx.orgId },
      select: { id: true, agentVersion: true },
    })

    if (!agent) throw new Error('Agente não encontrado.')

    if (resolveCanonicalAgentVersion(agent.agentVersion) !== 'single-v2') {
      throw new Error('Ferramentas globais só estão disponíveis na versão v2.')
    }

    const normalizedGlobalTools = normalizeToolIds(parsedInput.globalTools)

    await db.agent.update({
      where: { id: parsedInput.agentId },
      data: { globalTools: normalizedGlobalTools },
    })

    revalidateTag(`agent:${parsedInput.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })
