import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'

export interface AgentDto {
  id: string
  name: string
  isActive: boolean
  modelId: string
  pipelineIds: string[]
  toolsEnabled: string[]
  evolutionInstanceName: string | null
  stepsCount: number
  knowledgeFilesCount: number
  conversationsCount: number
  createdAt: Date
}

const fetchAgentsFromDb = async (orgId: string): Promise<AgentDto[]> => {
  const agents = await db.agent.findMany({
    where: { organizationId: orgId },
    include: {
      _count: {
        select: {
          steps: true,
          knowledgeFiles: true,
          conversations: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return agents.map((agent) => ({
    id: agent.id,
    name: agent.name,
    isActive: agent.isActive,
    modelId: agent.modelId,
    pipelineIds: agent.pipelineIds,
    toolsEnabled: agent.toolsEnabled,
    evolutionInstanceName: agent.evolutionInstanceName,
    stepsCount: agent._count.steps,
    knowledgeFilesCount: agent._count.knowledgeFiles,
    conversationsCount: agent._count.conversations,
    createdAt: agent.createdAt,
  }))
}

export const getAgents = cache(async (orgId: string): Promise<AgentDto[]> => {
  const getCached = unstable_cache(
    async () => fetchAgentsFromDb(orgId),
    [`agents-${orgId}`],
    { tags: [`agents:${orgId}`] },
  )

  return getCached()
})
