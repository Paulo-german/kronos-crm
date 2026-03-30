'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { deleteEvolutionInstance } from '@/_lib/evolution/instance-management'
import { resolveEvolutionCredentials } from '@/_lib/evolution/resolve-credentials'

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
        evolutionApiUrl: true,
        evolutionApiKey: true,
        agentId: true,
      },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Se tem instância Evolution, deletar da API (best-effort)
    // Self-hosted: não deletar a instância do usuário — apenas a referência no banco
    const isSelfHosted = !!(inbox.evolutionApiUrl && inbox.evolutionApiKey)
    if (inbox.evolutionInstanceName && !isSelfHosted) {
      try {
        const credentials = await resolveEvolutionCredentials(id)
        await deleteEvolutionInstance(inbox.evolutionInstanceName, credentials)
      } catch {
        // Best-effort: instância pode já ter sido removida
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
