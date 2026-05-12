import { z } from 'zod'

export const unlinkAppointmentFromDealSchema = z.object({
  appointmentId: z.string().uuid(),
})

export type UnlinkAppointmentFromDealInput = z.infer<typeof unlinkAppointmentFromDealSchema>
