import { z } from 'zod'

export const acceptInviteSchema = z.object({
  token: z.string().uuid(),
})

export type AcceptInviteSchema = z.infer<typeof acceptInviteSchema>
