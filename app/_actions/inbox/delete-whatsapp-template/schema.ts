import { z } from 'zod'

export const deleteWhatsAppTemplateSchema = z.object({
  inboxId: z.string().uuid('ID de inbox inválido'),
  templateName: z.string().min(1, 'Nome do template obrigatório'),
})

export type DeleteWhatsAppTemplateInput = z.infer<typeof deleteWhatsAppTemplateSchema>
