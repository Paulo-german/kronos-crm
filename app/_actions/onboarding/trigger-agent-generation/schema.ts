import { z } from 'zod'
import { businessProfileSchema } from '@/_lib/onboarding/schemas/business-profile'
import { configBundleSchema } from '@/_lib/onboarding/schemas/config-bundle'

export const triggerAgentGenerationSchema = z.object({
  businessProfile: businessProfileSchema,
  configBundle: configBundleSchema,
})
