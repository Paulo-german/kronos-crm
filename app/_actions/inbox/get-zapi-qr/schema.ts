import { z } from 'zod'

export const getZApiQRSchema = z.object({
  inboxId: z.string().uuid(),
})

export type GetZApiQRInput = z.infer<typeof getZApiQRSchema>
