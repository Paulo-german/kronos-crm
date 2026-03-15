'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { canPerformAction, requirePermission } from '@/_lib/rbac'

export const skipWhatsapp = orgActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))
    return { success: true }
  })
