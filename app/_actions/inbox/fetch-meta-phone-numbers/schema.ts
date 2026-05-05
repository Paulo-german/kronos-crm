import { z } from 'zod'

export const fetchMetaPhoneNumbersSchema = z.object({
  inboxId: z.string().uuid(),
})

export type FetchMetaPhoneNumbersInput = z.infer<typeof fetchMetaPhoneNumbersSchema>
