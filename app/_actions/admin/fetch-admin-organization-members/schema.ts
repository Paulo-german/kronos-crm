import { z } from 'zod'
export const fetchAdminOrganizationMembersSchema = z.object({
  organizationId: z.string().uuid(),
})
