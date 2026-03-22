'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateFollowUpBusinessHoursSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { Prisma } from '@prisma/client'

export const updateFollowUpBusinessHours = orgActionClient
  .schema(updateFollowUpBusinessHoursSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: apenas OWNER e ADMIN podem gerenciar agentes
    requirePermission(canPerformAction(ctx, 'agent', 'update'))

    // 2. Validar ownership: agente deve pertencer à organização do usuário
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 3. Persistir configuração de horário comercial dos follow-ups
    await db.agent.update({
      where: { id: data.agentId },
      data: {
        followUpBusinessHoursEnabled: data.followUpBusinessHoursEnabled,
        followUpBusinessHoursTimezone: data.followUpBusinessHoursTimezone,
        followUpBusinessHoursConfig:
          data.followUpBusinessHoursConfig === null
            ? Prisma.DbNull
            : data.followUpBusinessHoursConfig,
      },
    })

    // 4. Invalidar cache do agente
    revalidateTag(`agent:${data.agentId}`)
    revalidateTag(`agents:${ctx.orgId}`)

    return { success: true }
  })
