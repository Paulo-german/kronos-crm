import { z } from 'zod'

export const endSimulatorConversationSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
})

export type EndSimulatorConversationInput = z.infer<
  typeof endSimulatorConversationSchema
>
