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
import { resolveCanonicalAgentVersion } from '@/_lib/agent/agent-version'

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
  evolutionConnected: boolean
  metaPhoneNumberId: string | null
  metaPhoneDisplay: string | null
  pipeline: { id: string; name: string } | null
  // NAO incluir metaAccessToken (seguranca — nunca expor ao cliente via DTO)
}

export interface AgentGroupMembershipDto {
  memberId: string
  groupId: string
  groupName: string
  scopeLabel: string
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
  agentVersion: string
  followUpBusinessHoursEnabled: boolean
  followUpBusinessHoursTimezone: string
  followUpBusinessHoursConfig: FollowUpBusinessHoursConfig | null
  followUpExhaustedAction: ExhaustedAction
  followUpExhaustedConfig: ExhaustedConfig | null
  inboxes: AgentInboxDto[]
  steps: AgentStepDto[]
  knowledgeFiles: AgentKnowledgeFileDto[]
  groupMemberships: AgentGroupMembershipDto[]
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
      groupMemberships: {
        include: {
          group: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!agent) return null

  // Buscar pipelines referenciados por alguma inbox (não há relação Prisma — FK solta)
  const inboxPipelineIds = Array.from(
    new Set(
      agent.inboxes
        .map((inbox) => inbox.pipelineId)
        .filter((pipelineId): pipelineId is string => !!pipelineId),
    ),
  )
  const referencedPipelines =
    inboxPipelineIds.length > 0
      ? await db.pipeline.findMany({
          where: { id: { in: inboxPipelineIds }, organizationId: orgId },
          select: { id: true, name: true },
        })
      : []
  const pipelineById = new Map(
    referencedPipelines.map((pipeline) => [pipeline.id, pipeline]),
  )

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
    agentVersion: resolveCanonicalAgentVersion(agent.agentVersion),
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
      evolutionConnected: inbox.evolutionConnected,
      metaPhoneNumberId: inbox.metaPhoneNumberId,
      metaPhoneDisplay: inbox.metaPhoneDisplay,
      pipeline: inbox.pipelineId
        ? pipelineById.get(inbox.pipelineId) ?? null
        : null,
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
    groupMemberships: agent.groupMemberships.map((membership) => ({
      memberId: membership.id,
      groupId: membership.group.id,
      groupName: membership.group.name,
      scopeLabel: membership.scopeLabel,
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
