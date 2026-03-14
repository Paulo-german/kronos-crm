import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
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

// Registry de tools simples (recebem apenas ctx, sem config do step)
// update_event não está aqui — sua ativação é controlada por allowReschedule no create_event
// hand_off_to_human não está aqui — é config-aware (notificação WhatsApp configurável)
const SIMPLE_TOOL_REGISTRY = {
  move_deal: createMoveDealTool,
  update_contact: createUpdateContactTool,
  update_deal: createUpdateDealTool,
  create_task: createCreateTaskTool,
  search_knowledge: createSearchKnowledgeTool,
} as const

type SimpleToolName = keyof typeof SIMPLE_TOOL_REGISTRY

export function buildToolSet(
  toolsEnabled: string[],
  ctx: ToolContext,
  stepActions: StepAction[],
) {
  const tools: Record<
    string,
    | ReturnType<(typeof SIMPLE_TOOL_REGISTRY)[SimpleToolName]>
    | ReturnType<typeof createListAvailabilityTool>
    | ReturnType<typeof createCreateEventTool>
    | ReturnType<typeof createUpdateEventTool>
    | ReturnType<typeof createHandOffToHumanTool>
  > = {}

  for (const toolName of toolsEnabled) {
    // Tools config-aware: extraem parâmetros das actions configuradas no step builder

    if (toolName === 'list_availability') {
      const config = stepActions.find(
        (action) => action.type === 'list_availability',
      )
      if (config && config.type === 'list_availability') {
        tools[toolName] = createListAvailabilityTool(ctx, {
          daysAhead: config.daysAhead,
          slotDuration: config.slotDuration,
          startTime: config.startTime,
          endTime: config.endTime,
        })
      }
      continue
    }

    if (toolName === 'create_event') {
      const config = stepActions.find((action) => action.type === 'create_event')
      if (config && config.type === 'create_event') {
        tools[toolName] = createCreateEventTool(ctx, {
          titleInstructions: config.titleInstructions,
          duration: config.duration,
          startTime: config.startTime,
          endTime: config.endTime,
        })
        // Registrar update_event apenas se allowReschedule estiver habilitado no step builder
        if (config.allowReschedule) {
          tools['update_event'] = createUpdateEventTool(ctx)
        }
      }
      continue
    }

    if (toolName === 'hand_off_to_human') {
      const config = stepActions.find((action) => action.type === 'hand_off_to_human')
      if (config && config.type === 'hand_off_to_human') {
        tools[toolName] = createHandOffToHumanTool(ctx, {
          notifyTarget: config.notifyTarget,
          specificPhone: config.specificPhone,
          notificationMessage: config.notificationMessage,
        })
      } else {
        // Retrocompat: step sem config de notificação → tool sem config (comportamento original)
        tools[toolName] = createHandOffToHumanTool(ctx)
      }
      continue
    }

    // Tools simples — apenas injetam o ctx
    const factory = SIMPLE_TOOL_REGISTRY[toolName as SimpleToolName]
    if (factory) {
      tools[toolName] = factory(ctx)
    }
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
