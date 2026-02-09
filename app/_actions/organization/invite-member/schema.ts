import { z } from 'zod'
import { MemberRole } from '@prisma/client'

export const inviteMemberSchema = z.object({
  email: z.string().email('E-mail inválido'),
  role: z.nativeEnum(MemberRole),
})

export type InviteMemberSchema = z.infer<typeof inviteMemberSchema>
