import { z } from 'zod'

export const assignServiceToProfessionalSchema = z.object({
  professionalId: z.string().uuid('ID do profissional inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
})

export type AssignServiceToProfessionalInput = z.infer<typeof assignServiceToProfessionalSchema>
