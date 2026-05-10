import { z } from 'zod'

export const removeServiceFromProfessionalSchema = z.object({
  professionalId: z.string().uuid('ID do profissional inválido'),
  serviceId: z.string().uuid('ID do serviço inválido'),
})

export type RemoveServiceFromProfessionalInput = z.infer<typeof removeServiceFromProfessionalSchema>
