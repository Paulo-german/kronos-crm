import { z } from 'zod'

// evolutionWebhookSecret NÃO está no schema — gerado no servidor via crypto.randomUUID()
export const saveEvolutionGoCredentialsSchema = z.object({
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
  instanceName: z
    .string()
    .trim()
    .min(1, 'Nome da instância obrigatório')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Use apenas letras, números, hífens e underscores',
    ),
  // Pode ser vazio ao editar (mantém o token existente no banco)
  apiToken: z.string().trim(),
})

export type SaveEvolutionGoCredentialsInput = z.infer<typeof saveEvolutionGoCredentialsSchema>
