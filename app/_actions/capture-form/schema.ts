import { z } from 'zod'
import { captureFieldsSchema } from '@/_lib/capture-form/field-config'

export const createCaptureFormSchema = z.object({
  name: z.string().min(1).max(120),
  fields: captureFieldsSchema,
  buttonLabel: z.string().min(1).max(40),
  successMessage: z.string().min(1).max(280),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  assignedTo: z.string().uuid().optional(),
  isActive: z.boolean(),
})

export const updateCaptureFormSchema = createCaptureFormSchema.extend({
  id: z.string().uuid(),
})

export const deleteCaptureFormSchema = z.object({
  id: z.string().uuid(),
})

export const toggleCaptureFormStatusSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})
