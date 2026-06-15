import { z } from 'zod'

export const getInboxWebhookUrlSchema = z.object({
  inboxId: z.string().uuid(),
})

export type GetInboxWebhookUrlInput = z.infer<typeof getInboxWebhookUrlSchema>
