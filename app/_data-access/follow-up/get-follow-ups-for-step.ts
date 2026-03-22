// IMPORTANTE: Esta função roda no contexto do Trigger.dev (não no Next.js),
// portanto NÃO usa cache() nem unstable_cache(). Acessa o banco diretamente.
import { db } from '@/_lib/prisma'
import type { FollowUpDto } from './types'

/**
 * Dado um agente e o currentStepOrder de uma conversa, retorna TODOS os follow-ups
 * ativos que cobrem aquele step, ordenados por order asc. Usado pelo Trigger.dev
 * (cron e process-agent-message) para agendar e enviar follow-ups.
 *
 * followUpCount é usado como índice neste array (0-based).
 * Se followUpCount >= total → todos os follow-ups foram esgotados.
 */
export async function getFollowUpsForStep(agentId: string, stepOrder: number): Promise<FollowUpDto[]> {
  const followUps = await db.followUp.findMany({
    where: {
      agentId,
      isActive: true,
      agentStepLinks: {
        some: {
          agentStep: { order: stepOrder },
        },
      },
    },
    select: {
      id: true,
      agentId: true,
      organizationId: true,
      delayMinutes: true,
      messageContent: true,
      order: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      agentStepLinks: { select: { agentStepId: true } },
    },
    orderBy: { order: 'asc' },
  })

  return followUps.map((followUp) => ({
    id: followUp.id,
    agentId: followUp.agentId,
    organizationId: followUp.organizationId,
    delayMinutes: followUp.delayMinutes,
    messageContent: followUp.messageContent,
    order: followUp.order,
    isActive: followUp.isActive,
    agentStepIds: followUp.agentStepLinks.map((link) => link.agentStepId),
    createdAt: followUp.createdAt,
    updatedAt: followUp.updatedAt,
  }))
}
