import { z } from 'zod'

export const deleteModuleSchema = z.object({
  moduleId: z.string().uuid(),
})
