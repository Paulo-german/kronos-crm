import { z } from 'zod'

export const upsertModuleSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  isActive: z.boolean(),
})
