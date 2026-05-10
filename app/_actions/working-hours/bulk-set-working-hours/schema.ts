import { z } from 'zod'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

// 0 = domingo, 6 = sábado — alinhado com Date.getDay() do JS
const daySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    startTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm'),
    endTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm'),
  })
  .refine((data) => !data.enabled || data.startTime < data.endTime, {
    message: 'Hora final deve ser maior que hora inicial',
    path: ['endTime'],
  })

export const bulkSetWorkingHoursSchema = z.object({
  professionalId: z.string().uuid('ID do profissional inválido'),
  days: z.array(daySchema).length(7),
})

export type BulkSetWorkingHoursInput = z.infer<typeof bulkSetWorkingHoursSchema>
