import { z } from 'zod'

export const acceptProfessionalInviteSchema = z.object({
  token: z.string().uuid(),
})

export type AcceptProfessionalInviteInput = z.infer<
  typeof acceptProfessionalInviteSchema
>
