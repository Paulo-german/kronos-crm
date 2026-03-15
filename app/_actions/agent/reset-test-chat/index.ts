'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { resetTestChatSchema } from './schema'

export const resetTestChat = orgActionClient
  .schema(resetTestChatSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    // 1. RBAC: qualquer role que possa VER o agente pode testar
    requirePermission(canPerformAction(ctx, 'agent', 'read'))

    // 2. Quota: N/A (reset não cria entidade nova)

    // 3. Ownership: N/A

    // 4. Validação: verificar que o agentId pertence à org do usuário
    const agent = await db.agent.findFirst({
      where: { id: data.agentId, organizationId: ctx.orgId },
      select: { id: true },
    })

    if (!agent) {
      throw new Error('Agente não encontrado.')
    }

    // 5. Operação: localizar e limpar a conversa de teste deste usuário
    const testConversation = await db.agentTestConversation.findUnique({
      where: {
        agentId_userId: { agentId: data.agentId, userId: ctx.userId },
      },
      select: { id: true },
    })

    if (testConversation) {
      // Deletar todas as mensagens e resetar estado da conversa em paralelo
      await Promise.all([
        db.agentTestMessage.deleteMany({
          where: { testConversationId: testConversation.id },
        }),
        db.agentTestConversation.update({
          where: { id: testConversation.id },
          data: {
            currentStepOrder: 0,
            summary: null,
          },
        }),
      ])
    }

    // 6. Invalidar cache da conversa de teste para este usuário + agente
    revalidateTag(`agent-test-chat:${data.agentId}:${ctx.userId}`)

    return { success: true }
  })
