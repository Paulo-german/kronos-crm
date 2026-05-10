import { z } from 'zod'

const MAX_BIO_LENGTH = 500

export const createProfessionalSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone: z.string().trim().optional(),
  bio: z.string().trim().max(MAX_BIO_LENGTH, `Bio deve ter no máximo ${MAX_BIO_LENGTH} caracteres`).optional(),
  avatarUrl: z.string().url('URL do avatar inválida').optional(),
  userId: z.string().uuid('ID de usuário inválido').optional(),
})

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>
