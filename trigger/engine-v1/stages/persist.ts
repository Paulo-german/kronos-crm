import { db } from '@/_lib/prisma'
import { settleCredits } from '../../lib/settle-credits'
import type { Stage } from '../types'

// Acerto de contas do turno, ANTES do envio — assim créditos e estado ficam
// consistentes mesmo se o envio falhar (o send aborta sem retry). Reconcilia o débito
// otimista com o custo real das 2 chamadas e incrementa o turnCount da sessão (o
// engine é stateful; o single nem faz isso). A gravação da MENSAGEM fica no send
// (depende do resultado do envio: sent/failed).
export const persist: Stage = async ({
  ctx,
  session,
  estimatedCost,
  usage,
  modelId,
  sessionState,
}) => {
  if (estimatedCost !== undefined && modelId) {
    await settleCredits({
      organizationId: ctx.organizationId,
      estimatedCost,
      modelId,
      actualUsage: usage
        ? {
            inputTokens: usage.inputTokens ?? 0,
            outputTokens: usage.outputTokens ?? 0,
          }
        : null,
      reason: 'completed',
      metadata: {
        agentId: ctx.effectiveAgentId,
        conversationId: ctx.conversationId,
      },
    })
  }

  // turnCount++ sempre; grava o ledger novo quando o extract produziu um (Fase 1a).
  if (session) {
    await db.agentSession.update({
      where: { id: session.id },
      data: {
        turnCount: { increment: 1 },
        ...(sessionState ? { state: sessionState } : {}),
      },
    })
  }

  return {}
}
