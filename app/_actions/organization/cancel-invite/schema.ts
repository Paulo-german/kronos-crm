import { z } from 'zod'

export const cancelInviteSchema = z.object({
  memberId: z.string().uuid(),
})

export type CancelInviteSchema = z.infer<typeof cancelInviteSchema>
