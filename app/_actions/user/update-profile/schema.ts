import { z } from 'zod'

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome muito longo'),
  avatarUrl: z.string().url('URL inválida').nullable().optional(),
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/, 'Telefone inválido'),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
