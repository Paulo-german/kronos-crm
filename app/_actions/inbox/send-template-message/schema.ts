import { z } from 'zod'

const templateParameterSchema = z.object({
  type: z.literal('text'),
  text: z.string().min(1, 'Parâmetro não pode estar vazio'),
})

export const sendTemplateMessageSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  templateName: z.string().min(1, 'Nome do template obrigatório'),
  language: z.string().min(2, 'Idioma obrigatório'),
  headerParameters: z.array(templateParameterSchema).optional(),
  bodyParameters: z.array(templateParameterSchema).optional(),
})

export type SendTemplateMessageInput = z.infer<typeof sendTemplateMessageSchema>
