import { z } from 'zod'
export const adminUpdateMemberRoleSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: z.enum(['ADMIN', 'MEMBER']),
  adminKey: z.string().min(1),
})
