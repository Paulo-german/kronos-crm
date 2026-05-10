import { z } from 'zod'

export const removeWorkingHoursSchema = z.object({
  professionalId: z.string().uuid('ID do profissional inválido'),
  dayOfWeek: z.number().int().min(0).max(6),
})

export type RemoveWorkingHoursInput = z.infer<typeof removeWorkingHoursSchema>
