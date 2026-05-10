'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { canPerformAction, requirePermission } from '@/_lib/rbac'
import { updateDistributionModelSchema } from './schema'

export const updateDistributionModel = orgActionClient
  .schema(updateDistributionModelSchema)
  .action(async ({ parsedInput: data, ctx }) => {
    requirePermission(canPerformAction(ctx, 'organization', 'update'))

    await db.organization.update({
      where: { id: ctx.orgId },
      data: {
        distributionModel: data.distributionModel,
        // Limpar secondaryDistributionModel quando o modelo primário não for LOYALTY
        secondaryDistributionModel:
          data.distributionModel === 'LOYALTY' ? (data.secondaryDistributionModel ?? null) : null,
      },
    })

    revalidateTag(`scheduling-settings:${ctx.orgId}`)

    return { success: true }
  })
