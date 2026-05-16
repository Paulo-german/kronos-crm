import { z } from 'zod'

export const getSlotsByDateSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.date(),
  professionalId: z.string().uuid().optional(),
})

export type GetSlotsByDateInput = z.infer<typeof getSlotsByDateSchema>
