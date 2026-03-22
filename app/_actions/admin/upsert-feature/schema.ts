import { z } from 'zod'

export const upsertFeatureSchema = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  type: z.enum(['STATIC', 'METERED']),
  valueType: z.enum(['NUMBER', 'BOOLEAN', 'STRING']),
  moduleId: z.string().uuid(),
})
