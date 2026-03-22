import { z } from 'zod'

export const exhaustedConfigSchema = z
  .object({
    targetStageId: z.string().uuid().optional(),
    notifyTarget: z.enum(['deal_assignee', 'specific_number']).optional(),
    specificPhone: z.string().optional(),
  })
  .nullable()
  .optional()

export type ExhaustedConfigInput = z.infer<typeof exhaustedConfigSchema>

export const updateFollowUpExhaustedSchema = z.object({
  agentId: z.string().uuid(),
  followUpExhaustedAction: z.enum(['NONE', 'NOTIFY_HUMAN', 'MOVE_DEAL_STAGE']).default('NONE'),
  followUpExhaustedConfig: exhaustedConfigSchema,
})

export type UpdateFollowUpExhaustedInput = z.infer<typeof updateFollowUpExhaustedSchema>
