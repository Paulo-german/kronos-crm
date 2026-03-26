import { z } from 'zod'

export const declineInviteSchema = z.object({
  token: z.string().uuid(),
})

export type DeclineInviteSchema = z.infer<typeof declineInviteSchema>
