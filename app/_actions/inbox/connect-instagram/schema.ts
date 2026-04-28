import { z } from 'zod'

export const connectInstagramSchema = z.object({
  inboxId: z.string().uuid(),
  code: z.string().min(1, 'Authorization code is required'),
  igUserId: z.string().min(1, 'IG User ID is required'),
  pageId: z.string().min(1, 'Page ID is required'),
})

export type ConnectInstagramInput = z.infer<typeof connectInstagramSchema>
