import { z } from 'zod'

export const toggleConversationLabelSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  labelId: z.string().uuid('ID de etiqueta inválido'),
})

export type ToggleConversationLabelInput = z.infer<typeof toggleConversationLabelSchema>
