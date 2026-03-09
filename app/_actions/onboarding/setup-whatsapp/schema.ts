import { z } from 'zod'

export const setupWhatsappSchema = z.object({
  inboxName: z.string().optional().default('WhatsApp Principal'),
})
