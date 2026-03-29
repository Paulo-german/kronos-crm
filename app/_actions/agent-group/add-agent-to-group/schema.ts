import { z } from 'zod'

export const addAgentToGroupSchema = z.object({
  groupId: z.string().uuid(),
  agentId: z.string().uuid(),
  scopeLabel: z
    .string()
    .trim()
    .min(1, 'Descrição do escopo é obrigatória')
    .max(200),
})

export type AddAgentToGroupInput = z.input<typeof addAgentToGroupSchema>
