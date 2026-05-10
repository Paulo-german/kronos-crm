import { z } from 'zod'

const MAX_BIO_LENGTH = 500

export const updateProfessionalSchema = z.object({
  id: z.string().uuid('ID inválido'),
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  phone: z.string().trim().optional().nullable(),
  bio: z.string().trim().max(MAX_BIO_LENGTH, `Bio deve ter no máximo ${MAX_BIO_LENGTH} caracteres`).optional().nullable(),
  avatarUrl: z.string().url('URL do avatar inválida').optional().nullable(),
  isActive: z.boolean().optional(),
})

export type UpdateProfessionalInput = z.infer<typeof updateProfessionalSchema>
