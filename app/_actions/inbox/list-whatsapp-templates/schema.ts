import { z } from 'zod'

export const listWhatsAppTemplatesSchema = z.object({
  inboxId: z.string().uuid('ID de inbox inválido'),
})

export type ListWhatsAppTemplatesInput = z.infer<typeof listWhatsAppTemplatesSchema>
