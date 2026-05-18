import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import { mapCauseTypeToLabel } from '@/_lib/lifecycle/cause-type-labels'
import { DASHBOARD_V2_CACHE_REVALIDATE_S } from '@/_lib/lifecycle/dashboard-v2-constants'
import type { LifecycleHistoryItemDto } from '@/_data-access/lifecycle/types'

async function fetchContactLifecycleHistoryFromDb(
  contactId: string,
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<LifecycleHistoryItemDto[]> {
  const records = await db.contactLifecycleHistory.findMany({
    where: {
      contactId,
      organizationId: orgId,
      // MEMBER só vê histórico de contatos atribuídos a ele
      ...(elevated ? {} : { contact: { assignedTo: userId } }),
    },
    select: {
      id: true,
      fromStage: true,
      toStage: true,
      causeType: true,
      changedByUserId: true,
      createdAt: true,
      contact: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const userIds = Array.from(
    new Set(
      records
        .map((record) => record.changedByUserId)
        .filter((id): id is string => id !== null),
    ),
  )

  const userNameMap = new Map<string, string>()
  if (userIds.length > 0) {
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true },
    })
    for (const user of users) {
      if (user.fullName) userNameMap.set(user.id, user.fullName)
    }
  }

  return records.map((record) => {
    const changedByName = record.changedByUserId
      ? (userNameMap.get(record.changedByUserId) ?? null)
      : null

    return {
      id: record.id,
      contactId: record.contact.id,
      contactName: record.contact.name,
      fromStage: record.fromStage,
      toStage: record.toStage,
      causeType: record.causeType,
      causeLabel: mapCauseTypeToLabel(record.causeType, changedByName),
      changedByName,
      createdAt: record.createdAt,
    }
  })
}

export const getContactLifecycleHistory = cache(
  async (contactId: string, ctx: RBACContext): Promise<LifecycleHistoryItemDto[]> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => fetchContactLifecycleHistoryFromDb(contactId, ctx.orgId, ctx.userId, elevated),
      [`contact-lifecycle-history-${contactId}-${ctx.userId}-${elevated}`],
      {
        tags: [`contacts:${ctx.orgId}`, `contact:${contactId}`],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
