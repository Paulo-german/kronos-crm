import { z } from 'zod'
import { SquadRole } from '@prisma/client'

export const addSquadMemberSchema = z.object({
  squadId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.nativeEnum(SquadRole),
})

export type AddSquadMemberInput = z.infer<typeof addSquadMemberSchema>
