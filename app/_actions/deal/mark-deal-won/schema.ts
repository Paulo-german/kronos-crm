import { z } from 'zod'

export const markDealWonSchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
})

export type MarkDealWonInput = z.infer<typeof markDealWonSchema>
