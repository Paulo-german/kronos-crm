import { z } from 'zod'

export const editMessageSchema = z.object({
  messageId: z.string().uuid('ID de mensagem inválido.'),
  newText: z
    .string()
    .trim()
    .min(1, 'Mensagem não pode ser vazia.')
    .max(4000, 'Mensagem muito longa.'),
})
