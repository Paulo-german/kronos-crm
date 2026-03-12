import { z } from 'zod'

export const updateConversationSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  dealId: z.string().uuid('ID de negociação inválido').nullable().optional(),
  contactId: z.string().uuid('ID de contato inválido').optional(),
})

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>
