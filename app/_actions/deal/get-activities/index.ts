'use server'

import { z } from 'zod'
import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { findDealWithRBAC, canPerformAction, requirePermission } from '@/_lib/rbac'
import type { DealActivityDto } from '@/_data-access/deal/get-deal-details'

const schema = z.object({
  dealId: z.string().uuid(),
  offset: z.number().int().min(0),
  limit: z.number().int().min(1).max(50).default(10),
})

export const getActivities = orgActionClient
  .schema(schema)
  .action(async ({ parsedInput: data, ctx }): Promise<DealActivityDto[]> => {
    requirePermission(canPerformAction(ctx, 'deal', 'read'))
    await findDealWithRBAC(data.dealId, ctx)

    const activities = await db.activity.findMany({
      where: { dealId: data.dealId },
      orderBy: { createdAt: 'desc' },
      skip: data.offset,
      take: data.limit,
      include: {
        performer: {
          select: {
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return activities.map((a) => ({
      id: a.id,
      type: a.type,
      content: a.content,
      createdAt: a.createdAt,
      performer: a.performer,
    }))
  })
