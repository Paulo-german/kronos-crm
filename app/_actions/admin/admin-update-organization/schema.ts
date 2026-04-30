import { z } from 'zod'

export const adminUpdateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  adminKey: z.string().min(1, 'Senha obrigatória'),
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'Slug deve ter ao menos 3 caracteres')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífen'),
  niche: z.string().trim().max(100).nullable().optional(),
  isReadOnly: z.boolean(),
  planOverrideId: z.string().uuid().nullable().optional(),
})

export type AdminUpdateOrganizationInput = z.infer<typeof adminUpdateOrganizationSchema>
