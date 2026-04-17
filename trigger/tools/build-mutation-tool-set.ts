import { buildToolSet, type GlobalToolFlags } from './index'
import type { GroupToolConfig } from './transfer-to-agent'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { ToolContext } from './types'

// Tools reserved for Agent 2 (conversational layer) or the transport layer —
// must NOT be bound to Agent 1 (mutation phase).
const EXCLUDED_FROM_MUTATION_AGENT = [
  'search_knowledge',
  'send_media',
  'send_product_media',
] as const

export function buildMutationToolSet(
  toolsEnabled: string[],
  ctx: ToolContext,
  stepActions: StepAction[],
  globalFlags?: GlobalToolFlags,
  groupConfig?: GroupToolConfig,
) {
  const tools = buildToolSet(toolsEnabled, ctx, stepActions, globalFlags, groupConfig)
  if (!tools) return undefined

  for (const toolName of EXCLUDED_FROM_MUTATION_AGENT) {
    delete tools[toolName]
  }

  return Object.keys(tools).length > 0 ? tools : undefined
}
