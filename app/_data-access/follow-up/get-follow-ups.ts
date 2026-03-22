import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { FollowUpDto } from './types'

// Busca os follow-ups de um agente diretamente no banco (sem cache)
const fetchFollowUpsFromDb = async (agentId: string, orgId: string): Promise<FollowUpDto[]> => {
  const followUps = await db.followUp.findMany({
    where: {
      agentId,
      agent: { organizationId: orgId }, // Segurança: garante que o agente pertence à org
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

// Wrapper com cache duplo: React cache() + Next unstable_cache()
// Cache por agentId — MEMBERs não tem acesso diferenciado a follow-ups
export const getFollowUps = cache(async (agentId: string, orgId: string): Promise<FollowUpDto[]> => {
  const getCached = unstable_cache(
    async () => fetchFollowUpsFromDb(agentId, orgId),
    ['follow-ups', agentId],
    {
      tags: [`follow-ups:${agentId}`, `agent:${agentId}`],
      // Sem revalidate — cache infinito, invalidado por tags nas actions
    },
  )

  return getCached()
})
