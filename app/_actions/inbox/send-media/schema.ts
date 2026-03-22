import { z } from 'zod'

export const sendMediaSchema = z.object({
  conversationId: z.string().uuid('ID de conversa inválido'),
  mediaBase64: z.string().min(1, 'Arquivo não pode estar vazio'),
  mimetype: z.string().min(1, 'Tipo de arquivo é obrigatório'),
  fileName: z.string().min(1, 'Nome do arquivo é obrigatório'),
  caption: z.string().max(1024, 'Legenda muito longa').optional(),
})

export type SendMediaInput = z.infer<typeof sendMediaSchema>
