import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { GlobalTool } from '@/_actions/agent/shared/global-tool-schema'
import type { ToolContext } from './types'
import { createMoveDealTool } from './move-deal'
import { createUpdateContactTool } from './update-contact'
import { createUpdateDealTool } from './update-deal'
import { createCreateTaskTool } from './create-task'
import { createHandOffToHumanTool } from './hand-off-to-human'
import { createSearchKnowledgeTool } from './search-knowledge'
import { createCreateEventTool } from './create-event'
import { createListAvailabilityTool } from './list-availability'
import { createUpdateEventTool } from './update-event'
import { createSearchProductsTool } from './search-products'
import { createSendProductMediaTool } from './send-product-media'
import { createSendMediaTool } from './send-media'
import { createTransferToAgentTool } from './transfer-to-agent'
import { createGetServicesTool } from './get-services'
import { createSearchServiceTool } from './search-service'
import { createSearchProfessionalTool } from './search-professional'
import { createCreateAppointmentTool } from './create-appointment'
import { getRuntimeToolName } from './lib/runtime-tool-name'
import type { GroupToolConfig } from './transfer-to-agent'

// Re-export para uso no processAgentMessage
export type { GroupToolConfig }

// Flags globais para ativar tools que não vêm de step actions
export interface GlobalToolFlags {
  hasActiveProducts: boolean
  hasActiveProductsWithMedia: boolean
  hasKnowledgeBase: boolean // true quando completedFileCount > 0
  // Modo de operação do agente. Em BOOKING, o tooling de scheduling v2 (SERVICE)
  // é ativado: get_services, search_service, search_professional e create_appointment.
  // Em PIPELINE (default), o agente segue o fluxo padrão sem essas tools.
  agentMode: 'PIPELINE' | 'BOOKING'
}

// Registry de tools simples que suportam triggerHint (recebem ctx + opts opcionais).
// update_event não está aqui — sua ativação é controlada por allowReschedule no create_event.
// hand_off_to_human não está aqui — é config-aware (notificação WhatsApp configurável).
// search_knowledge não está aqui — não vem de stepActions, tratada separadamente no loop.
const SIMPLE_TOOL_REGISTRY = {
  move_deal: createMoveDealTool,
  update_contact: createUpdateContactTool,
  update_deal: createUpdateDealTool,
  create_task: createCreateTaskTool,
} as const

type SimpleToolName = keyof typeof SIMPLE_TOOL_REGISTRY

/**
 * Agrupa step actions por type, preservando a ordem original.
 * A ordem importa para o índice de naming determinístico:
 * primeira instância = índice 0, segunda = índice 1, etc.
 */
function groupActionsByType(actions: StepAction[]): Map<string, StepAction[]> {
  const byType = new Map<string, StepAction[]>()
  for (const action of actions) {
    const list = byType.get(action.type) ?? []
    list.push(action)
    byType.set(action.type, list)
  }
  return byType
}

export function buildToolSet(
  toolsEnabled: string[],
  ctx: ToolContext,
  stepActions: StepAction[],
  globalTools: GlobalTool[] = [],
  globalFlags?: GlobalToolFlags,
  groupConfig?: GroupToolConfig,
  omitLegacyMediaTools = false,
) {
  const tools: Record<
    string,
    | ReturnType<(typeof SIMPLE_TOOL_REGISTRY)[SimpleToolName]>
    | ReturnType<typeof createListAvailabilityTool>
    | ReturnType<typeof createCreateEventTool>
    | ReturnType<typeof createUpdateEventTool>
    | ReturnType<typeof createHandOffToHumanTool>
    | ReturnType<typeof createSearchKnowledgeTool>
    | ReturnType<typeof createSearchProductsTool>
    | ReturnType<typeof createSendProductMediaTool>
    | ReturnType<typeof createSendMediaTool>
    | ReturnType<typeof createTransferToAgentTool>
    | ReturnType<typeof createGetServicesTool>
    | ReturnType<typeof createSearchServiceTool>
    | ReturnType<typeof createSearchProfessionalTool>
    | ReturnType<typeof createCreateAppointmentTool>
  > = {}

  const stepActionsByType = groupActionsByType(stepActions)

  for (const toolName of toolsEnabled) {
    // Tools config-aware: extraem parâmetros das actions configuradas no step builder

    if (toolName === 'list_availability') {
      const configs = stepActionsByType.get('list_availability') ?? []
      configs.forEach((config, indexInGroup) => {
        if (config.type !== 'list_availability') return
        const runtimeName = getRuntimeToolName('list_availability', indexInGroup, configs.length)
        tools[runtimeName] = createListAvailabilityTool(ctx, {
          daysAhead: config.daysAhead,
          slotDuration: config.slotDuration,
          startTime: config.startTime,
          endTime: config.endTime,
          triggerHint: config.trigger,
        })
      })
      continue
    }

    if (toolName === 'create_event') {
      const configs = stepActionsByType.get('create_event') ?? []
      configs.forEach((config, indexInGroup) => {
        if (config.type !== 'create_event') return
        const runtimeName = getRuntimeToolName('create_event', indexInGroup, configs.length)
        tools[runtimeName] = createCreateEventTool(ctx, {
          titleInstructions: config.titleInstructions,
          duration: config.duration,
          startTime: config.startTime,
          endTime: config.endTime,
          triggerHint: config.trigger,
        })
        // Registrar update_event apenas se allowReschedule estiver habilitado no step builder
        if (config.allowReschedule) {
          tools['update_event'] = createUpdateEventTool(ctx)
        }
      })
      continue
    }

    if (toolName === 'hand_off_to_human') {
      // Unir instâncias globais e de step para indexação conjunta com naming determinístico
      const globalConfigs = globalTools.filter((tool) => tool.type === 'hand_off_to_human')
      const stepConfigs = (stepActionsByType.get('hand_off_to_human') ?? []).filter(
        (action) => action.type === 'hand_off_to_human',
      )
      const allHandOffConfigs = [...globalConfigs, ...stepConfigs]

      if (allHandOffConfigs.length > 0) {
        allHandOffConfigs.forEach((config, indexInGroup) => {
          if (config.type !== 'hand_off_to_human') return
          const runtimeName = getRuntimeToolName('hand_off_to_human', indexInGroup, allHandOffConfigs.length)
          tools[runtimeName] = createHandOffToHumanTool(
            ctx,
            {
              notifyTarget: config.notifyTarget,
              specificPhone: config.specificPhone,
              notificationMessage: config.notificationMessage,
            },
            { triggerHint: config.trigger },
          )
        })
      } else {
        // Retrocompat: sem config → tool sem config (comportamento original)
        tools[toolName] = createHandOffToHumanTool(ctx)
      }
      continue
    }

    // search_knowledge — injetada por toolsEnabled via flag global, sem step action associada
    if (toolName === 'search_knowledge') {
      tools['search_knowledge'] = createSearchKnowledgeTool(ctx)
      continue
    }

    // Tools simples — injetam ctx + triggerHint via opts
    const factory = SIMPLE_TOOL_REGISTRY[toolName as SimpleToolName]
    if (factory) {
      const configs = stepActionsByType.get(toolName) ?? []
      if (configs.length > 0) {
        configs.forEach((config, indexInGroup) => {
          const runtimeName = getRuntimeToolName(toolName, indexInGroup, configs.length)
          tools[runtimeName] = factory(ctx, { triggerHint: config.trigger })
        })
      } else {
        // Tool habilitada sem step action associada
        tools[toolName] = factory(ctx)
      }
    }
  }

  // Tools globais — ativadas por flags, não por step actions
  if (globalFlags?.hasActiveProducts) {
    tools['search_products'] = createSearchProductsTool(ctx)
  }

  // Scheduling v2 (SERVICE) — ativa quando o agente está em modo BOOKING.
  // Estas tools coexistem com create_event (COMMERCIAL) e habilitam o fluxo
  // completo de agendamento de serviços via agente.
  if (globalFlags?.agentMode === 'BOOKING') {
    tools['get_services'] = createGetServicesTool(ctx)
    tools['search_service'] = createSearchServiceTool(ctx)
    tools['search_professional'] = createSearchProfessionalTool(ctx)
    tools['create_appointment'] = createCreateAppointmentTool(ctx)
  }

  // Tools de mídia legadas — omitidas no single-v2 que usa detecção inline de URL
  if (!omitLegacyMediaTools) {
    if (globalFlags?.hasActiveProductsWithMedia) {
      tools['send_product_media'] = createSendProductMediaTool(ctx)
    }
    // Tool de envio de mídia — sempre disponível para agentes single-v1 e crew-v1
    tools['send_media'] = createSendMediaTool(ctx)
  }

  // Tool de transferência entre agentes — injetada quando o worker faz parte de um grupo
  // com mais de 1 worker ativo (transferir para si mesmo seria inútil)
  if (groupConfig && groupConfig.workers.length > 1) {
    tools['transfer_to_agent'] = createTransferToAgentTool(ctx, groupConfig)
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
