import { z } from 'zod'

export const deleteProfessionalSchema = z.object({
  id: z.string().uuid('ID inválido'),
})

export type DeleteProfessionalInput = z.infer<typeof deleteProfessionalSchema>
