import { z } from 'zod'
export const adminRemoveMemberSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
  adminKey: z.string().min(1),
})
