'use server'

import { tasks } from '@trigger.dev/sdk/v3'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { triggerAgentGenerationSchema } from './schema'

export const triggerAgentGeneration = orgActionClient
  .schema(triggerAgentGenerationSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    // Disparar as duas tasks em paralelo (prompt + steps são independentes)
    const [promptHandle, stepsHandle] = await Promise.all([
      tasks.trigger('onboarding-generate-system-prompt', {
        businessProfile: parsedInput.businessProfile,
        configBundle: parsedInput.configBundle,
      }),
      tasks.trigger('onboarding-generate-agent-steps', {
        businessProfile: parsedInput.businessProfile,
        stages: parsedInput.configBundle.pipelineStages,
      }),
    ])

    return {
      promptTaskId: promptHandle.id,
      stepsTaskId: stepsHandle.id,
    }
  })
