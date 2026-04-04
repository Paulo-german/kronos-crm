import { z } from 'zod'

export const uploadTemplateMediaSchema = z.object({
  inboxId: z.string().uuid('ID de inbox inválido'),
  fileBase64: z.string().min(1, 'Arquivo obrigatório'),
  fileLength: z.number().positive('Tamanho do arquivo obrigatório'),
  fileType: z.enum([
    'image/jpeg', 'image/png',
    'video/mp4', 'video/3gpp',
    'application/pdf',
  ]),
})

export type UploadTemplateMediaInput = z.infer<typeof uploadTemplateMediaSchema>
