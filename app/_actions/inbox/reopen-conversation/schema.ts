import { z } from 'zod'

export const reopenConversationSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
})

export type ReopenConversationInput = z.infer<typeof reopenConversationSchema>
