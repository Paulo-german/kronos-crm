import { z } from 'zod'

export const resendInviteSchema = z.object({
  memberId: z.string().uuid(),
})

export type ResendInviteSchema = z.infer<typeof resendInviteSchema>
