import { z } from 'zod'

export const updatePrivacyPolicyUrlSchema = z.object({
  // Aceita URL válida OU string vazia (para limpar). Trim evita espaços acidentais.
  privacyPolicyUrl: z.string().trim().url('URL inválida').max(500).optional().or(z.literal('')),
})
