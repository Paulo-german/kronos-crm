import { z } from 'zod'

export const createInboxSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  channel: z.enum(['WHATSAPP', 'WEB_CHAT']),
  agentId: z.string().uuid().optional().nullable(),
})

export type CreateInboxInput = z.infer<typeof createInboxSchema>
