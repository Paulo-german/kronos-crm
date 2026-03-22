import { z } from 'zod'

const dayScheduleSchema = z
  .object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
    end: z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  })
  .refine((data) => !data.enabled || data.start < data.end, {
    message: 'Horário de início deve ser anterior ao fim.',
    path: ['end'],
  })

export const followUpBusinessHoursConfigSchema = z.object({
  monday: dayScheduleSchema,
  tuesday: dayScheduleSchema,
  wednesday: dayScheduleSchema,
  thursday: dayScheduleSchema,
  friday: dayScheduleSchema,
  saturday: dayScheduleSchema,
  sunday: dayScheduleSchema,
})

export type FollowUpDaySchedule = z.infer<typeof dayScheduleSchema>
export type FollowUpBusinessHoursConfig = z.infer<
  typeof followUpBusinessHoursConfigSchema
>

export const updateFollowUpBusinessHoursSchema = z.object({
  agentId: z.string().uuid(),
  followUpBusinessHoursEnabled: z.boolean(),
  followUpBusinessHoursConfig: followUpBusinessHoursConfigSchema.nullable(),
  followUpBusinessHoursTimezone: z.string().refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
      } catch {
        return false
      }
    },
    { message: 'Fuso horário inválido' },
  ),
})

export type UpdateFollowUpBusinessHoursInput = z.infer<
  typeof updateFollowUpBusinessHoursSchema
>
