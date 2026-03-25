import { z } from 'zod'

export const transferDealSchema = z.object({
  dealId: z.string().uuid('ID do deal inválido'),
  newAssigneeId: z.string().uuid('ID do novo responsável inválido'),
  cascadeContacts: z.boolean().default(true),
})

export type TransferDealInput = z.infer<typeof transferDealSchema>
