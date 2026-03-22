import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { db } from '@/_lib/prisma'
import type { KnowledgeFileStatus } from '@prisma/client'
import type { BusinessHoursConfig } from '@/_actions/agent/update-agent/schema'
import type { FollowUpBusinessHoursConfig } from '@/_actions/follow-up/update-follow-up-business-hours/schema'
import type { ExhaustedAction, ExhaustedConfig } from '@/_data-access/follow-up/types'
import { promptConfigSchema } from '@/_actions/agent/shared/prompt-config-schema'
import type { PromptConfig } from '@/_actions/agent/shared/prompt-config-schema'
import {
  stepActionSchema,
  type StepAction,
} from '@/_actions/agent/shared/step-action-schema'

export interface AgentStepDto {
  id: string
  name: string
  objective: string
  actions: StepAction[]
  keyQuestion: string | null
  messageTemplate: string | null
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

export interface AgentInboxDto {
  id: string
  name: string
  channel: string
  isActive: boolean
  connectionType: string
  evolutionInstanceName: string | null
  evolutionInstanceId: string | null
  metaPhoneNumberId: string | null
  metaPhoneDisplay: string | null
  // NAO incluir metaAccessToken (seguranca — nunca expor ao cliente via DTO)
}

export interface AgentDetailDto {
  id: string
  name: string
  systemPrompt: string
  promptConfig: PromptConfig | null
  isActive: boolean
  modelId: string
  debounceSeconds: number
  pipelineIds: string[]
  businessHoursEnabled: boolean
  businessHoursTimezone: string
  businessHoursConfig: BusinessHoursConfig | null
  outOfHoursMessage: string | null
  followUpBusinessHoursEnabled: boolean
  followUpBusinessHoursTimezone: string
  followUpBusinessHoursConfig: FollowUpBusinessHoursConfig | null
  followUpExhaustedAction: ExhaustedAction
  followUpExhaustedConfig: ExhaustedConfig | null
  inboxes: AgentInboxDto[]
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
      inboxes: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!agent) return null

  const parsedPromptConfig = promptConfigSchema.safeParse(agent.promptConfig)
  if (!parsedPromptConfig.success) {
    console.warn('[get-agent-by-id] Invalid promptConfig for agent', agentId, parsedPromptConfig.error.flatten())
  }

  return {
    id: agent.id,
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    promptConfig: parsedPromptConfig.success ? parsedPromptConfig.data : null,
    isActive: agent.isActive,
    modelId: agent.modelId,
    debounceSeconds: agent.debounceSeconds,
    pipelineIds: agent.pipelineIds,
    businessHoursEnabled: agent.businessHoursEnabled,
    businessHoursTimezone: agent.businessHoursTimezone,
    businessHoursConfig: agent.businessHoursConfig as BusinessHoursConfig | null,
    outOfHoursMessage: agent.outOfHoursMessage,
    followUpBusinessHoursEnabled: agent.followUpBusinessHoursEnabled,
    followUpBusinessHoursTimezone: agent.followUpBusinessHoursTimezone,
    followUpBusinessHoursConfig:
      agent.followUpBusinessHoursConfig as FollowUpBusinessHoursConfig | null,
    followUpExhaustedAction: (agent.followUpExhaustedAction as ExhaustedAction) ?? 'NONE',
    followUpExhaustedConfig: (agent.followUpExhaustedConfig as ExhaustedConfig | null) ?? null,
    inboxes: agent.inboxes.map((inbox) => ({
      id: inbox.id,
      name: inbox.name,
      channel: inbox.channel,
      isActive: inbox.isActive,
      connectionType: inbox.connectionType,
      evolutionInstanceName: inbox.evolutionInstanceName,
      evolutionInstanceId: inbox.evolutionInstanceId,
      metaPhoneNumberId: inbox.metaPhoneNumberId,
      metaPhoneDisplay: inbox.metaPhoneDisplay,
    })),
    steps: agent.steps.map((step) => {
      const parsed = z.array(stepActionSchema).safeParse(step.actions)
      return {
        id: step.id,
        name: step.name,
        objective: step.objective,
        actions: parsed.success ? parsed.data : [],
        keyQuestion: step.keyQuestion,
        messageTemplate: step.messageTemplate,
        order: step.order,
      }
    }),
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
