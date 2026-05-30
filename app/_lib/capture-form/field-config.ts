import { z } from 'zod'

export const CAPTURE_FIELD_KEYS = ['name', 'email', 'phone', 'role'] as const
export type CaptureFieldKey = (typeof CAPTURE_FIELD_KEYS)[number]

export const captureFieldConfigSchema = z.object({
  visible: z.boolean(),
  required: z.boolean(),
  label: z.string().max(60).optional(),
})

export const captureFieldsSchema = z.object({
  name: captureFieldConfigSchema,
  email: captureFieldConfigSchema,
  phone: captureFieldConfigSchema,
  role: captureFieldConfigSchema,
})

export interface CaptureFieldConfig {
  visible: boolean
  required: boolean
  label?: string
}

export type CaptureFields = Record<CaptureFieldKey, CaptureFieldConfig>

export const DEFAULT_CAPTURE_FIELDS: CaptureFields = {
  name:  { visible: true,  required: true,  label: 'Nome'     },
  email: { visible: true,  required: false, label: 'E-mail'   },
  phone: { visible: true,  required: false, label: 'Telefone' },
  role:  { visible: false, required: false, label: 'Cargo'    },
}
