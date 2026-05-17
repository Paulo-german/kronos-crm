'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { getGoalSuggestion } from '@/_data-access/goal/get-goal-suggestion'

const getSuggestionSchema = z.object({
  type: z.enum(['REVENUE', 'DEALS_CLOSED', 'DEALS_OPENED', 'ACTIVITIES', 'CONVERSATIONS']),
  scope: z.enum(['ORG', 'PIPELINE', 'MEMBER']),
  targetUserId: z.string().uuid().nullable().optional(),
  targetPipelineId: z.string().uuid().nullable().optional(),
})

export const getGoalSuggestionAction = orgActionClient
  .schema(getSuggestionSchema)
  .action(async ({ parsedInput, ctx }) => {
    return getGoalSuggestion(ctx, parsedInput)
  })
