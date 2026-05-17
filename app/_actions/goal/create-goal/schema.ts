import { z } from 'zod'

export const createGoalSchema = z
  .object({
    type: z.enum(['REVENUE', 'DEALS_CLOSED', 'DEALS_OPENED', 'ACTIVITIES', 'CONVERSATIONS']),
    scope: z.enum(['ORG', 'PIPELINE', 'MEMBER']),
    period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']),
    targetValue: z.coerce.number().positive('Meta deve ser maior que zero.'),
    targetUserId: z.string().uuid().nullable().optional(),
    targetPipelineId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'MEMBER' && !data.targetUserId) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetUserId'],
        message: 'Membro é obrigatório para meta por vendedor.',
      })
    }
    if (data.scope === 'PIPELINE' && !data.targetPipelineId) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetPipelineId'],
        message: 'Pipeline é obrigatório para meta por funil.',
      })
    }
    if (data.scope === 'ORG' && (data.targetUserId || data.targetPipelineId)) {
      ctx.addIssue({
        code: 'custom',
        path: ['scope'],
        message: 'Meta de organização não aceita vendedor ou pipeline.',
      })
    }
  })

export type CreateGoalInput = z.infer<typeof createGoalSchema>
