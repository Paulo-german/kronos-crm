import { z } from 'zod'

export const addDealContactSchema = z.object({
  dealId: z.string().uuid(),
  contactId: z.string().uuid(),
  role: z.string().optional(),
  isPrimary: z.boolean().optional().default(false),
})

export type AddDealContactInput = z.infer<typeof addDealContactSchema>
