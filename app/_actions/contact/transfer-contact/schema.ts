import { z } from 'zod'

export const transferContactSchema = z.object({
  contactId: z.string().uuid('ID do contato inválido'),
  newAssigneeId: z.string().uuid('ID do novo responsável inválido'),
  cascadeDeals: z.boolean().default(true),
})

export type TransferContactInput = z.infer<typeof transferContactSchema>
