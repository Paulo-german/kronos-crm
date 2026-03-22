'use server'

import { orgActionClient } from '@/_lib/safe-action'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import { searchDealsSchema } from './schema'

const MAX_RESULTS = 10

export const searchDeals = orgActionClient
  .schema(searchDealsSchema)
  .action(async ({ parsedInput: { query }, ctx }) => {
    const elevated = isElevated(ctx.userRole)

    const deals = await db.deal.findMany({
      where: {
        organizationId: ctx.orgId,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        ...(elevated ? {} : { assignedTo: ctx.userId }),
        title: { contains: query, mode: 'insensitive' },
      },
      select: {
        id: true,
        title: true,
        contacts: {
          select: {
            contact: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: MAX_RESULTS,
    })

    return deals.map((deal) => ({
      id: deal.id,
      title: deal.title,
      contactName: deal.contacts?.[0]?.contact?.name ?? null,
    }))
  })
