'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { getAutomationById } from '@/_data-access/automation/get-automation-by-id'
import { getAutomationDetailSchema } from './schema'

export const getAutomationDetail = orgActionClient
  .schema(getAutomationDetailSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'automation', 'read'))

    const automation = await getAutomationById(data.id, ctx)

    if (!automation) {
      throw new Error('Automação não encontrada.')
    }

    return {
      id: automation.id,
      name: automation.name,
      description: automation.description,
      isActive: automation.isActive,
      triggerType: automation.triggerType,
      triggerConfig: automation.triggerConfig,
      conditions: automation.conditions,
      actionType: automation.actionType,
      actionConfig: automation.actionConfig,
    }
  })
