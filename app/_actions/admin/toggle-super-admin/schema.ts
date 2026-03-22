import { z } from 'zod'

export const toggleSuperAdminSchema = z.object({
  userId: z.string().uuid(),
})
