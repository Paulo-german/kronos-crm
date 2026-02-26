import type { ToolContext } from './types'
import { createMoveDealTool } from './move-deal'
import { createUpdateContactTool } from './update-contact'
import { createCreateTaskTool } from './create-task'
import { createHandOffToHumanTool } from './hand-off-to-human'
import { createSearchKnowledgeTool } from './search-knowledge'

const TOOL_REGISTRY = {
  move_deal: createMoveDealTool,
  update_contact: createUpdateContactTool,
  create_task: createCreateTaskTool,
  hand_off_to_human: createHandOffToHumanTool,
  search_knowledge: createSearchKnowledgeTool,
} as const

type ToolName = keyof typeof TOOL_REGISTRY

export function buildToolSet(toolsEnabled: string[], ctx: ToolContext) {
  const tools: Record<string, ReturnType<(typeof TOOL_REGISTRY)[ToolName]>> = {}

  for (const toolName of toolsEnabled) {
    const factory = TOOL_REGISTRY[toolName as ToolName]
    if (factory) {
      tools[toolName] = factory(ctx)
    }
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
