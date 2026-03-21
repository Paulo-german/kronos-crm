'use server'

import { tasks } from '@trigger.dev/sdk/v3'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { triggerConfigGenerationSchema } from './schema'

export const triggerConfigGeneration = orgActionClient
  .schema(triggerConfigGenerationSchema)
  .action(async ({ parsedInput, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    const handle = await tasks.trigger('onboarding-generate-config-bundle', {
      businessProfile: parsedInput.businessProfile,
    })

    return { taskId: handle.id }
  })
