import { z } from 'zod'

export const inviteProfessionalSchema = z.object({
  professionalId: z.string().uuid(),
  // Email para onde o convite será enviado (o profissional pode não ter conta ainda)
  email: z.string().trim().email('E-mail inválido'),
})

export type InviteProfessionalInput = z.infer<typeof inviteProfessionalSchema>
