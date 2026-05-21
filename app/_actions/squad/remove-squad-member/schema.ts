import { z } from 'zod'

export const removeSquadMemberSchema = z.object({
  squadMemberId: z.string().uuid(),
})

export type RemoveSquadMemberInput = z.infer<typeof removeSquadMemberSchema>
