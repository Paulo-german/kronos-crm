import { z } from 'zod'
export const adminCancelInviteSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
})
