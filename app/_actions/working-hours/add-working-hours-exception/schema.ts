import { z } from 'zod'

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/

export const addWorkingHoursExceptionSchema = z
  .object({
    professionalId: z.string().uuid('ID do profissional inválido'),
    date: z.coerce.date(),
    type: z.enum(['OFF', 'CUSTOM_HOURS']),
    startTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm').optional(),
    endTime: z.string().regex(TIME_REGEX, 'Horário deve estar no formato HH:mm').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'CUSTOM_HOURS' && (!data.startTime || !data.endTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Horário personalizado requer startTime e endTime',
        path: ['startTime'],
      })
    }

    if (
      data.type === 'CUSTOM_HOURS' &&
      data.startTime &&
      data.endTime &&
      data.startTime >= data.endTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Hora final deve ser maior que hora inicial',
        path: ['endTime'],
      })
    }
  })

export type AddWorkingHoursExceptionInput = z.infer<typeof addWorkingHoursExceptionSchema>
