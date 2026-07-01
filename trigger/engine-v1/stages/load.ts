import { db } from '@/_lib/prisma'
import type { ToolContext } from '../../tools/types'
import { buildEngineTools } from '../build-tools'
import { debitTurnCredits } from '../debit-turn-credits'
import { getOrCreateSession } from '../ledger/get-or-create-session'
import {
  loadAgentProfile,
  loadCapabilities,
  loadConversationState,
} from '../prompt/build-context'
import { compileEnginePrompt } from '../prompt/compile-prompt'
import type { EngineContext } from '../prompt/context'
import { buildMessages } from '../prompt/build-messages'
import { prefetchKnowledge } from '../prompt/prefetch-knowledge'
import type { Stage } from '../types'

// Carrega e prepara TODO o material que o generate consome: sessão (ledger),
// contexto por eixo de cadência, prompt compilado, histórico, ferramentas e o
// débito otimista de créditos. O generate só gera; a preparação mora aqui.
export const load: Stage = async ({ ctx }) => {
  const now = new Date()
  const { effectiveAgentId: agentId, conversationId, organizationId } = ctx

  // A conversa pode ter sumido entre o disparo e agora (corrida com reset/end do
  // simulador, contato removido, etc.). Sem ela não há turno — skip SEM retry:
  // retentar não traz a conversa de volta, e o findUniqueOrThrow adiante lançaria 3×.
  const conversationExists = await db.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true },
  })
  if (!conversationExists) {
    return { outcome: { type: 'skipped', reason: 'conversation_not_found' } }
  }

  // 1 rodada: tudo independente em paralelo. A conversa não espera mais a sessão —
  // ela só precisa do currentStepOrder, injetado na montagem abaixo.
  const [session, profile, capabilities, conversationBase, messages] =
    await Promise.all([
      getOrCreateSession({ agentId, conversationId, organizationId }),
      loadAgentProfile(agentId),
      loadCapabilities(agentId, organizationId),
      loadConversationState(conversationId, now),
      buildMessages(conversationId),
    ])

  const context: EngineContext = {
    profile,
    capabilities,
    conversation: {
      ...conversationBase,
      currentStepId: session.currentStepId,
    },
    nowIso: now.toISOString(),
  }

  const prompt = compileEnginePrompt(context)

  // toolContext: o que as ferramentas recebem. remoteJid/inboxProvider ficam null —
  // só send_product_media (ausente no engine) os usa.
  const toolContext: ToolContext = {
    organizationId,
    agentId,
    agentName: profile.agentName,
    conversationId,
    contactId: conversationBase.contactId,
    dealId: conversationBase.dealId,
    pipelineIds: profile.pipelineIds,
    remoteJid: null,
    inboxProvider: null,
  }
  const tools = buildEngineTools(toolContext, capabilities)

  // Débito otimista (barreira de saldo) + prefetch de KB rodam em paralelo — são
  // independentes. O prefetch é um REFORÇO: injeta a KB relevante à mensagem atual no
  // prompt do redator, cobrindo o "modelo esqueceu de buscar"; a tool search_knowledge
  // continua como rede pra re-buscar o que saiu da janela.
  // TODO(no_credits): avisar (createConversationEvent + notifyNoCredits) + ritual de
  // status/trace — centralizar no finalize do run-turn quando existir.
  const [{ debited, estimatedCost }, knowledgeBlock] = await Promise.all([
    debitTurnCredits({
      organizationId,
      agentId,
      conversationId,
      modelId: profile.modelId,
      promptTokens: prompt.estimatedTokens,
      messages,
    }),
    capabilities.hasKnowledgeBase
      ? prefetchKnowledge(agentId, messages)
      : Promise.resolve(null),
  ])
  if (!debited) {
    return { outcome: { type: 'skipped', reason: 'no_credits' } }
  }

  return {
    session,
    modelId: profile.modelId,
    prompt,
    messages,
    tools,
    toolContext,
    knowledgeBlock,
    estimatedCost,
  }
}
