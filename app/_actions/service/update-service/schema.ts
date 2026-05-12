import { z } from 'zod'

const MAX_SERVICE_DURATION_MINUTES = 720

export const updateServiceSchema = z.object({
  id: z.string().uuid('ID inválido'),
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres').optional(),
  // null = limpar categoria; undefined = não alterar; string = nova categoria
  categoryId: z.string().uuid('ID de categoria inválido').nullable().optional(),
  duration: z
    .number()
    .int('Duração deve ser um número inteiro')
    .positive('Duração deve ser positiva')
    .max(MAX_SERVICE_DURATION_MINUTES, `Duração máxima é ${MAX_SERVICE_DURATION_MINUTES} minutos`)
    .optional(),
  price: z.number().nonnegative('Preço deve ser zero ou positivo').optional(),
  isActive: z.boolean().optional(),
})

export type UpdateServiceInput = z.infer<typeof updateServiceSchema>
