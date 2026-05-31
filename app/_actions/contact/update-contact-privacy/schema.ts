import { z } from 'zod'
import { LegalBasis } from '@prisma/client'
import { CONTACT_PRIVACY_NOTES_MAX } from '@/_lib/constants/field-limits'

export const updateContactPrivacySchema = z.object({
  contactId: z.string().uuid(),
  legalBasis: z.nativeEnum(LegalBasis),
  ccpaSaleOptOut: z.boolean().optional(),
  notes: z.string().trim().max(CONTACT_PRIVACY_NOTES_MAX).optional(),
})

export type UpdateContactPrivacyInput = z.infer<typeof updateContactPrivacySchema>
