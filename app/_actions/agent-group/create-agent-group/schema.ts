import { z } from 'zod'
import { ROUTER_MODEL_IDS, DEFAULT_ROUTER_MODEL_ID } from '@/_lib/ai/models'

export const routerConfigSchema = z.object({
  fallbackAgentId: z.string().uuid().nullable().default(null),
  rules: z
    .array(
      z.object({
        agentId: z.string().uuid(),
        keywords: z.array(z.string()).optional(),
        description: z.string().max(300).optional(),
      }),
    )
    .optional(),
})

export const createAgentGroupSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  description: z.string().trim().max(500).optional(),
  routerModelId: z.enum(ROUTER_MODEL_IDS).default(DEFAULT_ROUTER_MODEL_ID),
  routerPrompt: z.string().trim().max(2000).optional(),
  routerConfig: routerConfigSchema.optional(),
  // Pelo menos 1 worker obrigatório na criação
  members: z
    .array(
      z.object({
        agentId: z.string().uuid(),
        scopeLabel: z.string().trim().min(1, 'Descrição do escopo é obrigatória').max(200),
      }),
    )
    .min(1, 'Equipe precisa de pelo menos 1 agente worker'),
})

export type CreateAgentGroupInput = z.input<typeof createAgentGroupSchema>
