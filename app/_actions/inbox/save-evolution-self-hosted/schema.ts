import { z } from 'zod'

// evolutionWebhookSecret NAO está no schema — é gerado no servidor via crypto.randomUUID()
export const evolutionSelfHostedSchema = z.object({
  inboxId: z.string().uuid(),
  evolutionApiUrl: z
    .string()
    .trim()
    .url('URL inválida')
    .refine(
      (url) => url.startsWith('https://') || url.startsWith('http://'),
      'URL deve começar com http:// ou https://',
    )
    .refine(
      (url) => !url.endsWith('/'),
      'URL não deve terminar com barra',
    ),
  // Pode ser vazio ao editar (mantém a key existente no banco)
  evolutionApiKey: z.string().trim(),
})

export type EvolutionSelfHostedInput = z.infer<typeof evolutionSelfHostedSchema>
