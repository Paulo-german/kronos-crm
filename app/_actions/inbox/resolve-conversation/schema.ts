import { z } from 'zod'

export const resolveConversationSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
})

export type ResolveConversationInput = z.infer<typeof resolveConversationSchema>
