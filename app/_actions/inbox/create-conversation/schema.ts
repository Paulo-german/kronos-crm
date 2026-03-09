import { z } from 'zod'

export const createConversationSchema = z.object({
  contactId: z.string().uuid('ID de contato inválido'),
  inboxId: z.string().uuid('ID de caixa inválido'),
})

export type CreateConversationInput = z.infer<typeof createConversationSchema>
