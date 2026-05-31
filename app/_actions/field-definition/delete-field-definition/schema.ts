import { z } from 'zod'

export const deleteFieldDefinitionSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteFieldDefinitionInput = z.infer<typeof deleteFieldDefinitionSchema>
