import { z } from 'zod'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const setWorkingHoursSchema = z
  .object({
    professionalId: z.string().uuid('ID do profissional inválido'),
    // 0 = domingo, 6 = sábado (alinhado com Date.getDay() do JS)
    dayOfWeek: z
      .number()
      .int('Dia da semana deve ser inteiro')
      .min(0, 'Dia da semana mínimo é 0 (domingo)')
      .max(6, 'Dia da semana máximo é 6 (sábado)'),
    startTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm'),
    endTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'Hora final deve ser maior que hora inicial',
    path: ['endTime'],
  })

export type SetWorkingHoursInput = z.infer<typeof setWorkingHoursSchema>
