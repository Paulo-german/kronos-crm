import type { AgentExportRow } from '@/_data-access/agent/get-agent-for-export'
import { promptConfigSchema } from '../shared/prompt-config-schema'
import { businessHoursConfigSchema } from '../update-agent/schema'
import { followUpBusinessHoursConfigSchema } from '@/_actions/follow-up/update-follow-up-business-hours/schema'
import { exhaustedConfigSchema } from '@/_actions/follow-up/update-follow-up-exhausted/schema'
import {
  globalToolsArraySchema,
  type ExportGlobalTool,
} from '../shared/global-tool-schema'
import { stepActionSchema } from '../shared/step-action-schema'
import { autoTaskItemSchema } from '../shared/step-fields-schema'
import { z } from 'zod'
import { AGENT_MODEL_IDS, type AgentModelId } from '@/_lib/ai/models'
import { EXPORT_VERSION, type ImportAgentInput } from '../import-agent/schema'

const stepActionsSchema = z.array(stepActionSchema)
const autoTasksSchema = z.array(autoTaskItemSchema)

const AGENT_VERSIONS = [
  'single-v1',
  'single-v2',
  'crew-v1',
  'engine-v1',
] as const
const AGENT_MODES = ['PRODUCT', 'SERVICE', 'HYBRID'] as const
const EXHAUSTED_ACTIONS = ['NONE', 'NOTIFY_HUMAN', 'MOVE_DEAL_STAGE'] as const

type AgentVersion = (typeof AGENT_VERSIONS)[number]
type AgentMode = (typeof AGENT_MODES)[number]
type ExhaustedAction = (typeof EXHAUSTED_ACTIONS)[number]

const toAgentVersion = (value: string): AgentVersion | undefined =>
  (AGENT_VERSIONS as readonly string[]).includes(value)
    ? (value as AgentVersion)
    : undefined

const toAgentMode = (value: string): AgentMode =>
  (AGENT_MODES as readonly string[]).includes(value)
    ? (value as AgentMode)
    : 'PRODUCT'

const toExhaustedAction = (value: string): ExhaustedAction =>
  (EXHAUSTED_ACTIONS as readonly string[]).includes(value)
    ? (value as ExhaustedAction)
    : 'NONE'

const toModelId = (value: string): AgentModelId | undefined =>
  (AGENT_MODEL_IDS as readonly string[]).includes(value)
    ? (value as AgentModelId)
    : undefined

/**
 * Reescreve os stepIds (UUIDs da org de origem) das global tools com scope
 * 'steps' para o `order` do step correspondente, serializado como string.
 * O `order` é o identificador semântico estável e portável entre orgs.
 * Entradas órfãs (stepId sem step correspondente) são descartadas.
 */
const remapToolStepIdsToOrders = (
  tools: ReturnType<typeof globalToolsArraySchema.parse>,
  stepIdToOrder: Map<string, number>,
): ExportGlobalTool[] =>
  tools.map((tool) => {
    // Tools globais não dependem de etapas — zera stepIds para não vazar UUIDs
    // da org de origem (não-portáveis) no arquivo de export.
    if (tool.scope !== 'steps') return { ...tool, stepIds: [] }
    const orders = tool.stepIds
      .map((stepId) => stepIdToOrder.get(stepId))
      .filter((order): order is number => order !== undefined)
      .map((order) => String(order))
    return { ...tool, stepIds: orders }
  })

/**
 * Função pura: transforma a linha crua do agente no payload canônico de export.
 * Todo Json do Prisma passa por safeParse dos schemas compartilhados antes de
 * ser serializado — espelha o padrão de get-agent-by-id (zero `any`).
 */
export const buildAgentExport = (row: AgentExportRow): ImportAgentInput => {
  const stepIdToOrder = new Map<string, number>(
    row.steps.map((step) => [step.id, step.order]),
  )

  const parsedPromptConfig = promptConfigSchema.safeParse(row.promptConfig)
  const parsedBusinessHours = businessHoursConfigSchema.safeParse(
    row.businessHoursConfig,
  )
  const parsedFollowUpBusinessHours =
    followUpBusinessHoursConfigSchema.safeParse(row.followUpBusinessHoursConfig)
  const parsedExhaustedConfig = exhaustedConfigSchema.safeParse(
    row.followUpExhaustedConfig,
  )
  const parsedGlobalTools = globalToolsArraySchema.safeParse(
    row.globalTools ?? [],
  )

  const remappedTools = parsedGlobalTools.success
    ? remapToolStepIdsToOrders(parsedGlobalTools.data, stepIdToOrder)
    : []

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    agent: {
      name: row.name,
      systemPrompt: row.systemPrompt,
      promptConfig: parsedPromptConfig.success ? parsedPromptConfig.data : null,
      modelId: toModelId(row.modelId),
      agentVersion: toAgentVersion(row.agentVersion),
      agentMode: toAgentMode(row.agentMode),
      debounceSeconds: row.debounceSeconds,
      isActive: row.isActive,
      businessHoursEnabled: row.businessHoursEnabled,
      businessHoursTimezone: row.businessHoursTimezone,
      businessHoursConfig: parsedBusinessHours.success
        ? parsedBusinessHours.data
        : null,
      outOfHoursMessage: row.outOfHoursMessage,
      followUpBusinessHoursEnabled: row.followUpBusinessHoursEnabled,
      followUpBusinessHoursTimezone: row.followUpBusinessHoursTimezone,
      followUpBusinessHoursConfig: parsedFollowUpBusinessHours.success
        ? parsedFollowUpBusinessHours.data
        : null,
      followUpExhaustedAction: toExhaustedAction(row.followUpExhaustedAction),
      followUpExhaustedConfig: parsedExhaustedConfig.success
        ? parsedExhaustedConfig.data
        : null,
      globalTools: remappedTools,
      steps: row.steps.map((step) => {
        const parsedActions = stepActionsSchema.safeParse(step.actions)
        const parsedAutoTasks = autoTasksSchema.safeParse(step.autoTasks)
        return {
          name: step.name,
          objective: step.objective,
          allowedActions: step.allowedActions,
          activationRequirement: step.activationRequirement,
          order: step.order,
          actions: parsedActions.success ? parsedActions.data : null,
          keyQuestion: step.keyQuestion,
          messageTemplate: step.messageTemplate,
          lifecycleTrigger: step.lifecycleTrigger,
          lifecycleDealPipelineId: step.lifecycleDealPipelineId,
          autoDealStageId: step.autoDealStageId,
          autoTasks: parsedAutoTasks.success ? parsedAutoTasks.data : null,
        }
      }),
    },
  }
}
