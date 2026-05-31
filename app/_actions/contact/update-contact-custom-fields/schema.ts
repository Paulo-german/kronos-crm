import { z } from 'zod'

export const updateContactCustomFieldsSchema = z.object({
  contactId: z.string().uuid(),
  values: z
    .array(
      z.object({
        fieldDefinitionId: z.string().uuid(),
        value: z.string().max(5000).nullable(),
      }),
    )
    .min(1)
    .max(100),
})

export type UpdateContactCustomFieldsInput = z.infer<typeof updateContactCustomFieldsSchema>
