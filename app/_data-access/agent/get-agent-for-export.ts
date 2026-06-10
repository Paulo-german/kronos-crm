import 'server-only'
import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { LifecycleStage, Prisma } from '@prisma/client'

/**
 * Step cru do agente para export — preserva campos que o AgentStepDto de
 * get-agent-by-id NÃO mapeia (allowedActions, activationRequirement).
 * Os campos Json (actions, autoTasks) chegam crus do Prisma e são validados
 * via safeParse na camada de action (build-export.ts).
 */
export interface AgentExportStepRow {
  id: string
  name: string
  objective: string
  allowedActions: string[]
  activationRequirement: string | null
  order: number
  actions: Prisma.JsonValue
  keyQuestion: string | null
  messageTemplate: string | null
  lifecycleTrigger: LifecycleStage | null
  lifecycleDealPipelineId: string | null
  autoDealStageId: string | null
  autoTasks: Prisma.JsonValue
}

/**
 * Linha portável do agente — só os campos que viajam entre orgs. Sem id,
 * organizationId, createdAt/updatedAt nem relações não-portáveis (inboxes,
 * knowledgeFiles, executions, etc.).
 */
export interface AgentExportRow {
  name: string
  systemPrompt: string
  promptConfig: Prisma.JsonValue
  modelId: string
  agentVersion: string
  agentMode: string
  debounceSeconds: number
  isActive: boolean
  businessHoursEnabled: boolean
  businessHoursTimezone: string
  businessHoursConfig: Prisma.JsonValue
  outOfHoursMessage: string | null
  followUpBusinessHoursEnabled: boolean
  followUpBusinessHoursTimezone: string
  followUpBusinessHoursConfig: Prisma.JsonValue
  followUpExhaustedAction: string
  followUpExhaustedConfig: Prisma.JsonValue
  globalTools: Prisma.JsonValue
  steps: AgentExportStepRow[]
}

const fetchAgentForExport = async (
  agentId: string,
  orgId: string,
): Promise<AgentExportRow | null> => {
  const agent = await db.agent.findFirst({
    where: { id: agentId, organizationId: orgId },
    include: { steps: { orderBy: { order: 'asc' } } },
  })

  if (!agent) return null

  return {
    name: agent.name,
    systemPrompt: agent.systemPrompt,
    promptConfig: agent.promptConfig ?? null,
    modelId: agent.modelId,
    agentVersion: agent.agentVersion,
    agentMode: agent.agentMode,
    debounceSeconds: agent.debounceSeconds,
    isActive: agent.isActive,
    businessHoursEnabled: agent.businessHoursEnabled,
    businessHoursTimezone: agent.businessHoursTimezone,
    businessHoursConfig: agent.businessHoursConfig ?? null,
    outOfHoursMessage: agent.outOfHoursMessage,
    followUpBusinessHoursEnabled: agent.followUpBusinessHoursEnabled,
    followUpBusinessHoursTimezone: agent.followUpBusinessHoursTimezone,
    followUpBusinessHoursConfig: agent.followUpBusinessHoursConfig ?? null,
    followUpExhaustedAction: agent.followUpExhaustedAction,
    followUpExhaustedConfig: agent.followUpExhaustedConfig ?? null,
    globalTools: agent.globalTools ?? null,
    steps: agent.steps.map((step) => ({
      id: step.id,
      name: step.name,
      objective: step.objective,
      allowedActions: step.allowedActions,
      activationRequirement: step.activationRequirement,
      order: step.order,
      actions: step.actions ?? null,
      keyQuestion: step.keyQuestion,
      messageTemplate: step.messageTemplate,
      lifecycleTrigger: step.lifecycleTrigger,
      lifecycleDealPipelineId: step.lifecycleDealPipelineId,
      autoDealStageId: step.autoDealStageId ?? null,
      autoTasks: step.autoTasks ?? null,
    })),
  }
}

export const getAgentForExport = cache(
  async (agentId: string, orgId: string): Promise<AgentExportRow | null> => {
    const getCached = unstable_cache(
      async () => fetchAgentForExport(agentId, orgId),
      [`agent-export-${orgId}-${agentId}`],
      { tags: [`agent:${agentId}`, `agents:${orgId}`] },
    )

    return getCached()
  },
)
