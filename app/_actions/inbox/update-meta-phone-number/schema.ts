import { z } from 'zod'

export const updateMetaPhoneNumberSchema = z.object({
  inboxId: z.string().uuid(),
  phoneNumberId: z.string().min(1),
})

export type UpdateMetaPhoneNumberInput = z.infer<typeof updateMetaPhoneNumberSchema>
