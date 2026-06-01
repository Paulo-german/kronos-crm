import { z } from 'zod'

export const exportContactDataSchema = z.object({
  contactId: z.string().uuid(),
  dsrRequestId: z.string().uuid().optional(),
})
