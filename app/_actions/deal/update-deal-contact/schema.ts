import { z } from 'zod'

export const updateDealContactSchema = z.object({
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional(),
})

export type UpdateDealContactInput = z.infer<typeof updateDealContactSchema>
