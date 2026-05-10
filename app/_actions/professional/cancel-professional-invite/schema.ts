import { z } from 'zod'

export const cancelProfessionalInviteSchema = z.object({
  professionalId: z.string().uuid(),
})

export type CancelProfessionalInviteInput = z.infer<typeof cancelProfessionalInviteSchema>
