import { z } from 'zod'

export const anonymizeContactSchema = z.object({
  contactId: z.string().uuid(),
  dsrRequestId: z.string().uuid().optional(),
  notes: z.string().max(1000).optional(),
})
