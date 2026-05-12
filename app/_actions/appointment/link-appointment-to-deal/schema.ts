import { z } from 'zod'

export const linkAppointmentToDealSchema = z.object({
  appointmentId: z.string().uuid(),
  dealId: z.string().uuid(),
})

export type LinkAppointmentToDealInput = z.infer<typeof linkAppointmentToDealSchema>
