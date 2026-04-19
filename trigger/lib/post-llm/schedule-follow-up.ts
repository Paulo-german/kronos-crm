import { logger } from '@trigger.dev/sdk/v3'
import { db } from '@/_lib/prisma'
import { getFollowUpsForStep } from '@/_data-access/follow-up/get-follow-ups-for-step'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduleFollowUpCtx {
  conversationId: string
  agentId: string
  // Quando o caller já tem o step autoritativo (ex: orchestrator v2 logo após
  // persistir currentStepOrder), passar aqui economiza 1 roundtrip no banco.
  stepOrder?: number
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/**
 * Agenda o próximo follow-up para a conversa com base no step atual.
 *
 * Lê currentStepOrder diretamente do banco — o orchestrator v2 persiste o
 * step inferido pelo Agent 1 ANTES de invocar este helper, garantindo que
 * sempre usamos o valor mais atualizado.
 *
 * Se existem follow-ups para o step: atualiza nextFollowUpAt com o delay do
 * primeiro FUP da sequência e reseta followUpCount a 0.
 *
 * Se não existem: limpa nextFollowUpAt para evitar FUPs órfãos de steps
 * anteriores disparando indefinidamente.
 *
 * Erro: try/catch interno — falha no agendamento NÃO derruba o envio
 * principal (o cliente já recebeu a resposta). Estado inválido é limpo
 * para evitar loop no cron de follow-ups.
 */
export async function scheduleFollowUp(ctx: ScheduleFollowUpCtx): Promise<void> {
  const { conversationId, agentId, stepOrder } = ctx

  try {
    let currentStepOrder: number

    if (stepOrder !== undefined) {
      currentStepOrder = stepOrder
    } else {
      const conversation = await db.conversation.findUnique({
        where: { id: conversationId },
        select: { currentStepOrder: true },
      })

      if (!conversation) {
        logger.warn('scheduleFollowUp: conversa não encontrada', { conversationId })
        return
      }

      currentStepOrder = conversation.currentStepOrder ?? 0
    }

    const followUps = await getFollowUpsForStep(agentId, currentStepOrder)

    if (followUps.length === 0) {
      // Nenhum follow-up cobre este step — limpar qualquer FUP pendente de steps anteriores
      await db.conversation.update({
        where: { id: conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })

      logger.info('Follow-up: nenhum FUP configurado para o step atual', {
        conversationId,
        agentId,
        currentStepOrder,
      })
      return
    }

    const firstFollowUp = followUps[0]
    const nextFollowUpAt = new Date(
      Date.now() + firstFollowUp.delayMinutes * 60 * 1000,
    )

    await db.conversation.update({
      where: { id: conversationId },
      data: {
        nextFollowUpAt,
        followUpCount: 0,
      },
    })

    logger.info('Follow-up agendado', {
      conversationId,
      agentId,
      currentStepOrder,
      totalFollowUps: followUps.length,
      firstDelayMinutes: firstFollowUp.delayMinutes,
      nextFollowUpAt: nextFollowUpAt.toISOString(),
    })
  } catch (error) {
    logger.error('Falha ao agendar follow-up (non-fatal)', {
      conversationId,
      agentId,
      error: error instanceof Error ? error.message : String(error),
    })

    // Limpa estado para evitar FUP órfão disparando indefinidamente no cron
    await db.conversation
      .update({
        where: { id: conversationId },
        data: { nextFollowUpAt: null, followUpCount: 0 },
      })
      .catch(() => {})
  }
}
