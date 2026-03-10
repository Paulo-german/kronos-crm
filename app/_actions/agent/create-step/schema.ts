import { z } from 'zod'
import { stepFieldsSchema } from '../shared/step-fields-schema'

export const createStepSchema = stepFieldsSchema.extend({
  agentId: z.string().uuid(),
})

export type CreateStepInput = z.infer<typeof createStepSchema>
export type CreateStepFormInput = z.input<typeof createStepSchema>
