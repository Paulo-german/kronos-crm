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

export const createWhatsAppTemplateSchema = z.object({
  inboxId: z.string().uuid('ID de inbox inválido'),
  name: z
    .string()
    .min(1, 'Nome obrigatório')
    .max(512, 'Nome muito longo')
    .regex(
      /^[a-z0-9_]+$/,
      'Somente letras minúsculas, números e underscore',
    ),
  language: z.string().min(2).max(10),
  // AUTHENTICATION excluido: requer fluxo OTP especializado (ver PLAN secao 3.3)
  category: z.enum(['MARKETING', 'UTILITY']),
  components: z.object({
    header: templateHeaderSchema.optional(),
    body: templateBodySchema,
    footer: templateFooterSchema.optional(),
  }),
})

export type CreateWhatsAppTemplateInput = z.infer<typeof createWhatsAppTemplateSchema>
