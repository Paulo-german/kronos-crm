import { z } from 'zod'

const MAX_BIO_LENGTH = 500
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

const workingHoursDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    startTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
    endTime: z.string().regex(TIME_REGEX, 'Formato HH:mm'),
  })
  .refine((data) => !data.enabled || data.startTime < data.endTime, {
    message: 'Hora de início deve ser anterior à hora de fim',
    path: ['endTime'],
  })

export const createProfessionalSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  phone: z.string().trim().optional(),
  email: z.string().trim().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  bio: z.string().trim().max(MAX_BIO_LENGTH, `Bio deve ter no máximo ${MAX_BIO_LENGTH} caracteres`).optional(),
  avatarUrl: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url('URL do avatar inválida').optional()),
  userId: z.string().uuid('ID de usuário inválido').optional(),
  serviceIds: z.array(z.string().uuid()).optional(),
  workingHours: z.array(workingHoursDaySchema).length(7).optional(),
})

export type CreateProfessionalInput = z.infer<typeof createProfessionalSchema>
