import { z } from 'zod'

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  text: z.string().min(1, 'Mensagem não pode estar vazia').max(4000, 'Mensagem muito longa'),
  // Apenas relevante para canal INSTAGRAM_DM — ativa messaging_type=MESSAGE_TAG+HUMAN_AGENT (janela de 7 dias)
  useHumanAgentTag: z.boolean().optional().default(false),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
