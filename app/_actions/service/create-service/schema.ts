import { z } from 'zod'

const MAX_SERVICE_DURATION_MINUTES = 720

export const createServiceSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  categoryId: z.string().uuid('ID de categoria inválido').optional(),
  // Duração em minutos — máximo 12h (720 min)
  duration: z
    .number()
    .int('Duração deve ser um número inteiro')
    .positive('Duração deve ser positiva')
    .max(MAX_SERVICE_DURATION_MINUTES, `Duração máxima é ${MAX_SERVICE_DURATION_MINUTES} minutos`),
  price: z.number().nonnegative('Preço deve ser zero ou positivo'),
  isActive: z.boolean().default(true),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
