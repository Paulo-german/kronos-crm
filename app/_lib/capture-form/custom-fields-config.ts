import { z } from 'zod'
import { FieldType } from '@prisma/client'

export const MAX_CUSTOM_FIELDS_PER_FORM = 20

export const captureFormFieldConfigSchema = z.object({
  fieldDefinitionId: z.string().uuid(),
  required: z.boolean().default(false),
  labelOverride: z.string().trim().min(1).max(80).nullable().optional(),
  position: z.number().int().min(0),
})

export type CaptureFormFieldConfig = z.infer<typeof captureFormFieldConfigSchema>

export const captureFormCustomFieldsSchema = z
  .array(captureFormFieldConfigSchema)
  .max(MAX_CUSTOM_FIELDS_PER_FORM)
  .superRefine((fields, ctx) => {
    const seen = new Set<string>()
    fields.forEach((field, index) => {
      if (seen.has(field.fieldDefinitionId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Campo duplicado.',
          path: [index, 'fieldDefinitionId'],
        })
      }
      seen.add(field.fieldDefinitionId)
    })
  })

export interface CaptureSubmissionSnapshotEntry {
  label: string
  value: string | null
  type: FieldType
}

export interface CaptureSubmissionSnapshot {
  [fieldId: string]: CaptureSubmissionSnapshotEntry
}

export function buildSubmissionSnapshot(args: {
  systemValues: { name: string; email?: string; phone?: string; role?: string }
  customFields: Array<{
    fieldId: string
    label: string
    type: FieldType
    value: string | null
  }>
}): CaptureSubmissionSnapshot {
  const snapshot: CaptureSubmissionSnapshot = {}

  snapshot['name'] = { label: 'Nome', value: args.systemValues.name, type: FieldType.TEXT }

  if (args.systemValues.email !== undefined) {
    snapshot['email'] = { label: 'E-mail', value: args.systemValues.email ?? null, type: FieldType.EMAIL }
  }

  if (args.systemValues.phone !== undefined) {
    snapshot['phone'] = { label: 'Telefone', value: args.systemValues.phone ?? null, type: FieldType.PHONE }
  }

  if (args.systemValues.role !== undefined) {
    snapshot['role'] = { label: 'Cargo', value: args.systemValues.role ?? null, type: FieldType.TEXT }
  }

  for (const field of args.customFields) {
    snapshot[field.fieldId] = { label: field.label, value: field.value, type: field.type }
  }

  return snapshot
}
