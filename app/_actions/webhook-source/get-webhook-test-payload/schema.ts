import { z } from 'zod'

export const getWebhookTestPayloadSchema = z.object({
  webhookSourceId: z.string().uuid(),
})
