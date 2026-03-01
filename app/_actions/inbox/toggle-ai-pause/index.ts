'use server'

import { revalidateTag } from 'next/cache'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { toggleAiPauseSchema } from './schema'

export const toggleAiPause = orgActionClient
  .schema(toggleAiPauseSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. Verificar permissão
    requirePermission(canPerformAction(ctx, 'conversation', 'update'))

    // 2. Validar conversa pertence à org
    const conversation = await db.conversation.findFirst({
      where: { id: data.conversationId, organizationId: ctx.orgId },
    })

    if (!conversation) {
      throw new Error('Conversa não encontrada.')
    }

    // 3. Atualizar estado
    await db.conversation.update({
      where: { id: data.conversationId },
      data: {
        aiPaused: data.aiPaused,
        pausedAt: data.aiPaused ? new Date() : null,
      },
    })

    // 4. Invalidar cache
    revalidateTag(`conversations:${ctx.orgId}`)
    revalidateTag(`conversation-messages:${data.conversationId}`)

    return { success: true }
  })
