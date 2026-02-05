import { z } from 'zod'

export const removeMemberSchema = z.object({
  memberId: z.string().uuid(),
})

export type RemoveMemberSchema = z.infer<typeof removeMemberSchema>
