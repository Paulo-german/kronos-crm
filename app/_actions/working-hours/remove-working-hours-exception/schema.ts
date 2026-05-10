import { z } from 'zod'

export const removeWorkingHoursExceptionSchema = z.object({
  id: z.string().uuid('ID inválido'),
  // professionalId é necessário para invalidar o cache correto após a remoção
  professionalId: z.string().uuid('ID do profissional inválido'),
})

export type RemoveWorkingHoursExceptionInput = z.infer<typeof removeWorkingHoursExceptionSchema>
