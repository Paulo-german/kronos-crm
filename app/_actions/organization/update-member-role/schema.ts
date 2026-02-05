import { z } from 'zod'
import { MemberRole } from '@prisma/client'

export const updateMemberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.nativeEnum(MemberRole),
})

export type UpdateMemberRoleSchema = z.infer<typeof updateMemberRoleSchema>
