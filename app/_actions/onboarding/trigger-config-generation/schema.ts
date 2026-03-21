import { z } from 'zod'
import { businessProfileSchema } from '@/_lib/onboarding/schemas/business-profile'

export const triggerConfigGenerationSchema = z.object({
  businessProfile: businessProfileSchema,
})
