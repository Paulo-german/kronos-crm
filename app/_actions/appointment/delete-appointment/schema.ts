import { z } from 'zod'

export const deleteAppointmentSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteAppointmentInput = z.infer<typeof deleteAppointmentSchema>
