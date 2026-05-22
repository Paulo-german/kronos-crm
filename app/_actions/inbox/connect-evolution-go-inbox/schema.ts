import { z } from 'zod'

export const connectEvolutionGoInboxSchema = z.object({
  inboxId: z.string().uuid(),
  apiUrl: z
    .string()
    .trim()
    .url('URL inválida')
    .refine(
      (url) => url.startsWith('https://') || url.startsWith('http://'),
      'URL deve começar com http:// ou https://',
    )
    .refine((url) => !url.endsWith('/'), 'URL não deve terminar com barra'),
  apiToken: z.string().trim().min(1, 'Token obrigatório'),
})

export type ConnectEvolutionGoInboxInput = z.infer<typeof connectEvolutionGoInboxSchema>
