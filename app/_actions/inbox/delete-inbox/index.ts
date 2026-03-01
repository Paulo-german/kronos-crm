'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { disconnectEvolutionInstance } from '@/_lib/evolution/instance-management'

const deleteInboxSchema = z.object({
  id: z.string().uuid(),
})

export const deleteInbox = orgActionClient
  .schema(deleteInboxSchema)
  .action(async ({ parsedInput: { id }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'delete'))

    // 2. Verificar inbox pertence à org
    const inbox = await db.inbox.findFirst({
      where: { id, organizationId: ctx.orgId },
      select: {
        id: true,
        evolutionInstanceName: true,
        agentId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Se tem instância Evolution, desconectar (best-effort)
    if (inbox.evolutionInstanceName) {
      try {
        await disconnectEvolutionInstance(inbox.evolutionInstanceName)
      } catch {
        // Best-effort: sessão Evolution pode expirar sozinha
      }
    }

    // 4. Deletar inbox (cascade deleta conversations e messages via Prisma)
    await db.inbox.delete({
      where: { id },
    })

    // 5. Invalidar cache
    revalidateTag(`inboxes:${ctx.orgId}`)
    revalidateTag(`conversations:${ctx.orgId}`)
    if (inbox.agentId) {
      revalidateTag(`agent:${inbox.agentId}`)
      revalidateTag(`agents:${ctx.orgId}`)
    }

    return { success: true }
  })
