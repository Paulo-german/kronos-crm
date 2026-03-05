import { z } from 'zod'

export const createInboxSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  channel: z.enum(['WHATSAPP', 'WEB_CHAT']),
  agentId: z.string().uuid().optional().nullable(),
  autoCreateDeal: z.boolean().optional(),
  pipelineId: z.string().uuid().nullable().optional(),
  distributionUserIds: z.array(z.string().uuid()).optional(),
})

export type CreateInboxInput = z.infer<typeof createInboxSchema>
