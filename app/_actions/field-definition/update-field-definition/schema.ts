import { z } from 'zod'
import { fieldOptionSchema } from '@/_lib/custom-fields/types'
import {
  FIELD_DEFINITION_LABEL_MAX,
  FIELD_DEFINITION_OPTIONS_MAX,
} from '@/_lib/constants/field-limits'

// `type` e `entityType` são imutáveis — alterá-los mudaria a semântica dos
// valores já gravados em CustomFieldValue.
export const updateFieldDefinitionSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1, 'Nome do campo é obrigatório').max(FIELD_DEFINITION_LABEL_MAX).optional(),
  isRequired: z.boolean().optional(),
  options: z.array(fieldOptionSchema).max(FIELD_DEFINITION_OPTIONS_MAX).optional(),
})

export type UpdateFieldDefinitionInput = z.infer<typeof updateFieldDefinitionSchema>
