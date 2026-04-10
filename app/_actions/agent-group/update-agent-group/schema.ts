import { z } from 'zod'
import { ROUTER_MODEL_IDS } from '@/_lib/ai/models'
import { routerConfigSchema } from '../create-agent-group/schema'

export const updateAgentGroupSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  routerModelId: z.enum(ROUTER_MODEL_IDS).optional(),
  routerPrompt: z.string().trim().max(2000).nullable().optional(),
  routerConfig: routerConfigSchema.optional(),
})

export type UpdateAgentGroupInput = z.input<typeof updateAgentGroupSchema>
