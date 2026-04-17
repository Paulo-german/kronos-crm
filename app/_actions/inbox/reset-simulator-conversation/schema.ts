import { z } from 'zod'

export const resetSimulatorConversationSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
})

export type ResetSimulatorConversationInput = z.infer<
  typeof resetSimulatorConversationSchema
>
