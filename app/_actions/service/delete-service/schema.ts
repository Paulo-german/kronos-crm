import { z } from 'zod'

export const deleteServiceSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type DeleteServiceInput = z.infer<typeof deleteServiceSchema>
