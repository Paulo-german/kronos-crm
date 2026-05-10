import { z } from 'zod'

export const resendProfessionalInviteSchema = z.object({
  professionalId: z.string().uuid(),
})

export type ResendProfessionalInviteInput = z.infer<typeof resendProfessionalInviteSchema>
