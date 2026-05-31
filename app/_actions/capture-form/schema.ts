import { z } from 'zod'
import { captureFieldsSchema } from '@/_lib/capture-form/field-config'
import { captureAppearanceSchema } from '@/_lib/capture-form/appearance-config'
import { captureFormCustomFieldsSchema } from '@/_lib/capture-form/custom-fields-config'

// Base sem refine para permitir .extend() e uso como resolver no react-hook-form
export const captureFormBaseSchema = z.object({
  name: z.string().trim().min(1).max(120),
  fields: captureFieldsSchema,
  appearance: captureAppearanceSchema,
  buttonLabel: z.string().trim().min(1).max(40),
  successMessage: z.string().trim().min(1).max(280),
  redirectUrl: z.string().url().optional().or(z.literal('')),
  distributionUserIds: z.array(z.string().uuid()),
  squadId: z.string().uuid().nullable().optional(),
  isActive: z.boolean(),
  customFields: captureFormCustomFieldsSchema.optional().default([]),
  // Campos de consentimento LGPD/GDPR (Fase 3)
  consentRequired: z.boolean().default(true),
  consentText: z.string().trim().max(1000).optional().or(z.literal('')),
})

// Membros específicos e squad são mutuamente exclusivos
const exclusiveDistribution = (data: { distributionUserIds: string[]; squadId?: string | null }) =>
  !(data.distributionUserIds.length > 0 && data.squadId)

const exclusiveDistributionError = {
  message: 'Escolha apenas membros específicos OU um time.',
  path: ['squadId'],
}

// Validação cross-field: consentRequired = true exige consentText não-vazio
const consentTextRequired = (data: { consentRequired?: boolean; consentText?: string }) =>
  !data.consentRequired || (!!data.consentText && data.consentText.trim().length > 0)

const consentTextRequiredError = {
  message: 'O texto do consentimento é obrigatório quando o consentimento é exigido.',
  path: ['consentText'],
}

export const createCaptureFormSchema = captureFormBaseSchema
  .refine(exclusiveDistribution, exclusiveDistributionError)
  .refine(consentTextRequired, consentTextRequiredError)

export const updateCaptureFormSchema = captureFormBaseSchema
  .extend({
    id: z.string().uuid(),
  })
  .refine(exclusiveDistribution, exclusiveDistributionError)
  .refine(consentTextRequired, consentTextRequiredError)

export const deleteCaptureFormSchema = z.object({
  id: z.string().uuid(),
})

export const toggleCaptureFormStatusSchema = z.object({
  id: z.string().uuid(),
  isActive: z.boolean(),
})
