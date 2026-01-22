import { z } from 'zod'

export const reopenDealSchema = z.object({
  dealId: z.string().uuid(),
})

export type ReopenDealSchema = z.infer<typeof reopenDealSchema>
