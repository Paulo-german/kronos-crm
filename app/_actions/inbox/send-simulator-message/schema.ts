import { z } from 'zod'

export const sendSimulatorMessageSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  text: z.string().min(1, 'Mensagem não pode ser vazia').max(5000),
})

export type SendSimulatorMessageInput = z.infer<typeof sendSimulatorMessageSchema>
