import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  avatarUrl: z.string().url('URL inválida').nullable().optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
