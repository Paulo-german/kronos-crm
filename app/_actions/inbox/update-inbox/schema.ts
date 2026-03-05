import { z } from 'zod'

export const updateInboxSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1, 'Nome não pode ser vazio').max(100).optional(),
    agentId: z.string().uuid().optional().nullable(),
    isActive: z.boolean().optional(),
    autoCreateDeal: z.boolean().optional(),
    pipelineId: z.string().uuid().nullable().optional(),
    distributionUserIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => Object.keys(data).length > 1, {
    message: 'Envie pelo menos um campo para atualizar',
  })

export type UpdateInboxInput = z.infer<typeof updateInboxSchema>
