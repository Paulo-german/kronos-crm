import { z } from 'zod'

export const sendAudioSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  audioBase64: z.string().min(1, 'Áudio não pode estar vazio'),
  duration: z.number().min(0),
})

export type SendAudioInput = z.infer<typeof sendAudioSchema>
