'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { removeEvolutionSelfHostedSchema } from './schema'

export const removeEvolutionSelfHosted = orgActionClient
  .schema(removeEvolutionSelfHostedSchema)
  .action(async ({ parsedInput: { inboxId }, ctx }) => {
    // 1. RBAC
    requirePermission(canPerformAction(ctx, 'inbox', 'update'))

    // 2. Verificar que o inbox pertence à org
    const inbox = await db.inbox.findFirst({
      where: { id: inboxId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!inbox) {
      throw new Error('Caixa de entrada não encontrada.')
    }

    // 3. Limpar credenciais — NÃO tocar na instância do usuário (nenhum delete remoto)
    await db.inbox.update({
      where: { id: inbox.id },
      data: {
        evolutionApiUrl: null,
        evolutionApiKey: null,
        evolutionWebhookSecret: null,
      },
    })

    // 4. Invalidar cache
    revalidateTag(`inbox:${inbox.id}`)
    revalidateTag(`inboxes:${ctx.orgId}`)

    return { success: true }
  })
