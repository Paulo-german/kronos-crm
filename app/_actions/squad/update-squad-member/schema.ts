import { z } from 'zod'
import { SquadRole } from '@prisma/client'

export const updateSquadMemberSchema = z.object({
  squadMemberId: z.string().uuid(),
  role: z.nativeEnum(SquadRole).optional(),
  isActive: z.boolean().optional(),
  weight: z.number().int().min(5).multipleOf(5).optional(),
})

export type UpdateSquadMemberInput = z.infer<typeof updateSquadMemberSchema>
