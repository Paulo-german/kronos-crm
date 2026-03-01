import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  text: z.string().min(1, 'Mensagem não pode estar vazia').max(4000, 'Mensagem muito longa'),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
