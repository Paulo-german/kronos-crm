import { z } from 'zod'
import { globalToolsArraySchema } from '../shared/global-tool-schema'

export const updateAgentGlobalToolsSchema = z.object({
  agentId: z.string().uuid(),
  globalTools: globalToolsArraySchema,
})
