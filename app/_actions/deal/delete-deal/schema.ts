import { z } from 'zod'

export const deleteDealSchema = z.object({
  id: z.string().uuid('ID do deal inválido'),
})

export type DeleteDealInput = z.infer<typeof deleteDealSchema>
