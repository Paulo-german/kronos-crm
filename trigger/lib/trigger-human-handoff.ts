import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import { revalidateConversationCache } from './revalidate-cache'
import type { TriggerHumanHandoffCtx } from './two-phase-types'

/**
 * Pausa a conversa programaticamente e registra event de handoff na timeline.
 *
 * Diferente do tool `hand_off_to_human` (LLM-driven), esta função é minimalista:
 * não envia notificação WhatsApp, não cria activity no deal, não cria notificação
 * in-app. Usada pelo orchestrator v2 para o branch de fallback de guardrail (§4.4).
 *
 * Ordem crítica: deve ser chamada DEPOIS do envio da mensagem GENERIC_SAFE_FALLBACK
 * ao cliente — nunca antes. Chamar antes pausaria a conversa prematuramente e
 * checkAntiAtropelamento bloquearia o envio, deixando o cliente em silêncio total.
 */
export async function triggerHumanHandoff(ctx: TriggerHumanHandoffCtx): Promise<void> {
  // pausedAt: null → pausa indefinida (auto-unpause NÃO dispara),
  // mesmo padrão do tool hand_off_to_human
  await db.conversation.update({
    where: {
      id: ctx.conversationId,
      organizationId: ctx.organizationId,
    },
    data: {
      aiPaused: true,
      pausedAt: null,
    },
  })

  // Event aparece na timeline do inbox com subtype HAND_OFF_TO_HUMAN para que
  // o atendente entenda o motivo da transferência sem precisar checar logs
  await db.conversationEvent.create({
    data: {
      conversationId: ctx.conversationId,
      type: 'INFO',
      content: ctx.reason,
      metadata: {
        subtype: 'HAND_OFF_TO_HUMAN',
        phaseTraceId: ctx.phaseTraceId,
      } as Prisma.InputJsonValue,
      visibleToUser: true,
    },
  })

  // Invalida cache para que a UI reflita imediatamente o estado aiPaused = true
  await revalidateConversationCache(ctx.conversationId, ctx.organizationId)
}
