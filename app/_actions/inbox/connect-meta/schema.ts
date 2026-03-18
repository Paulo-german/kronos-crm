import { z } from 'zod'

export const connectMetaSchema = z.object({
  inboxId: z.string().uuid(),
  code: z.string().min(1, 'Authorization code is required'),
  wabaId: z.string().min(1, 'WABA ID is required'),
  phoneNumberId: z.string().min(1, 'Phone Number ID is required'),
})

export type ConnectMetaInput = z.infer<typeof connectMetaSchema>
