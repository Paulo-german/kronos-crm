import { z } from 'zod'

export const getAvailableProfessionalsSchema = z.object({
  serviceId: z.string().uuid(),
  startDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:mm inválido'),
  contactId: z.string().uuid().optional(),
})
