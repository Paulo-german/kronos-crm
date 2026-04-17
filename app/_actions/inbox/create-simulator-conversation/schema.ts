import { z } from 'zod'

export const createSimulatorConversationSchema = z.object({
  agentId: z.string().uuid('ID de agente inválido'),
})

export type CreateSimulatorConversationInput = z.infer<typeof createSimulatorConversationSchema>
