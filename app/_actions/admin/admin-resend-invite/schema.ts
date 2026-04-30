import { z } from 'zod'
export const adminResendInviteSchema = z.object({
  organizationId: z.string().uuid(),
  memberId: z.string().uuid(),
})
