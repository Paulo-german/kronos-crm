import { z } from 'zod'
import { CUSTOM_FIELD_VALUE_SCHEMA_MAX } from '@/_lib/constants/field-limits'

export const updateContactCustomFieldsSchema = z.object({
  contactId: z.string().uuid(),
  values: z
    .array(
      z.object({
        fieldDefinitionId: z.string().uuid(),
        value: z.string().max(CUSTOM_FIELD_VALUE_SCHEMA_MAX).nullable(),
      }),
    )
    .min(1)
    .max(100),
})

export type UpdateContactCustomFieldsInput = z.infer<typeof updateContactCustomFieldsSchema>
