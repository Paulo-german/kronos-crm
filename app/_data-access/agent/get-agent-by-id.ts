import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { KnowledgeFileStatus } from '@prisma/client'

export interface AgentStepDto {
  id: string
  name: string
  objective: string
  allowedActions: string[]
  activationRequirement: string | null
  order: number
}

export interface AgentKnowledgeFileDto {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  status: KnowledgeFileStatus
  chunkCount: number
  createdAt: Date
}

export interface AgentDetailDto {
  id: string
  name: string
  systemPrompt: string
  isActive: boolean
  modelId: string
  debounceSeconds: number
  pipelineIds: string[]
  toolsEnabled: string[]
  evolutionInstanceName: string | null
  evolutionInstanceId: string | null
  steps: AgentStepDto[]
  knowledgeFiles: AgentKnowledgeFileDto[]
  createdAt: Date
  updatedAt: Date
}

const fetchAgentByIdFromDb = async (
  agentId: string,
  orgId: string,
): Promise<AgentDetailDto | null> => {
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId: orgId },
    include: {
      steps: { orderBy: { order: 'asc' } },
      knowledgeFiles: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!agent) return null

  return {
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    isActive: agent.isActive,
    modelId: agent.modelId,
    debounceSeconds: agent.debounceSeconds,
    pipelineIds: agent.pipelineIds,
    toolsEnabled: agent.toolsEnabled,
    evolutionInstanceName: agent.evolutionInstanceName,
    evolutionInstanceId: agent.evolutionInstanceId,
    steps: agent.steps.map((step) => ({
      id: step.id,
      name: step.name,
      objective: step.objective,
      allowedActions: step.allowedActions,
      activationRequirement: step.activationRequirement,
      order: step.order,
    })),
    knowledgeFiles: agent.knowledgeFiles.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      status: file.status,
      chunkCount: file.chunkCount,
      createdAt: file.createdAt,
    })),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  }
}

export const getAgentById = cache(async (
  agentId: string,
  orgId: string,
): Promise<AgentDetailDto | null> => {
  const getCached = unstable_cache(
    async () => fetchAgentByIdFromDb(agentId, orgId),
    [`agent-${agentId}`],
    { tags: [`agent:${agentId}`, `agents:${orgId}`] },
  )

  return getCached()
})
