import { z } from 'zod'

const templateHeaderSchema = z.object({
  format: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT']),
  text: z.string().max(60).optional(),
  exampleMediaHandle: z.string().optional(),
})

const templateBodySchema = z.object({
  text: z.string().min(1, 'Corpo do template obrigatório').max(1024),
  examples: z.array(z.string()).optional(),
})

const templateFooterSchema = z.object({
  text: z.string().max(60),
})

export const editWhatsAppTemplateSchema = z.object({
  inboxId: z.string().uuid('ID de inbox inválido'),
  templateId: z.string().min(1, 'ID do template obrigatório'),
  components: z.object({
    header: templateHeaderSchema.optional(),
    body: templateBodySchema,
    footer: templateFooterSchema.optional(),
  }),
})

export type EditWhatsAppTemplateInput = z.infer<typeof editWhatsAppTemplateSchema>
