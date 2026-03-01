'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { updateInboxSchema } from './schema'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const updateInbox = orgActionClient
  .schema(updateInboxSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar inbox pertence à org (inclui evolutionInstanceName para saber se está conectado)
    const existingInbox = await db.inbox.findFirst({
      where: { id: data.id, organizationId: ctx.orgId },
      select: { id: true, agentId: true, evolutionInstanceName: true },
    })

    if (!existingInbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Se agentId mudar, validar novo agent na org
    if (data.agentId !== undefined && data.agentId !== null) {
      const agent = await db.agent.findFirst({
        where: { id: data.agentId, organizationId: ctx.orgId },
        select: { id: true },
      })

      if (!agent) {
        throw new Error('Agente não encontrado ou não pertence à organização.')
      }
    }

    // 4. Update com spread condicional
    await db.inbox.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.agentId !== undefined && { agentId: data.agentId }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    // 5. Invalidar cache
    revalidateTag(`inbox:${data.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    // Invalidar tags de agent se mudou
    if (data.agentId !== undefined) {
      if (existingInbox.agentId) {
        revalidateTag(`agent:${existingInbox.agentId}`)
      }
      if (data.agentId) {
        revalidateTag(`agent:${data.agentId}`)
      }
      revalidateTag(`agents:${ctx.orgId}`)

      // Se inbox conectado e agent mudou, invalidar conversas (webhook roteia para novo agent)
      if (existingInbox.evolutionInstanceName && data.agentId !== existingInbox.agentId) {
        revalidateTag(`conversations:${ctx.orgId}`)
      }
    }

    return { success: true }
  })
