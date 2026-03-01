import { z } from 'zod'

export const toggleAiPauseSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  aiPaused: z.boolean(),
})

export type ToggleAiPauseInput = z.infer<typeof toggleAiPauseSchema>
