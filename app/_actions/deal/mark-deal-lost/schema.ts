import { z } from 'zod'

export const markDealLostSchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
})

export type MarkDealLostInput = z.infer<typeof markDealLostSchema>
