import { z } from 'zod'
import { stepFieldsSchema } from '../shared/step-fields-schema'

export const updateStepSchema = stepFieldsSchema.extend({
  id: z.string().uuid(),
  agentId: z.string().uuid(),
})

export type UpdateStepInput = z.infer<typeof updateStepSchema>
