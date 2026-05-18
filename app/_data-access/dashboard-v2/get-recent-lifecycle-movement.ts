import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { LifecycleCauseType, LifecycleStage } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import { mapCauseTypeToLabel } from '@/_lib/lifecycle/cause-type-labels'
import {
  DASHBOARD_V2_CACHE_REVALIDATE_S,
  RECENT_MOVEMENT_LIMIT,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import type { DateRange } from '@/_data-access/dashboard/types'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'

export interface LifecycleMovementItemDto {
  id: string
  contactId: string
  contactName: string
  contactAvatarUrl: string | null
  fromStage: LifecycleStage | null
  toStage: LifecycleStage
  causeType: LifecycleCauseType
  causeLabel: string
  changedByName: string | null
  createdAt: Date
}

async function fetchRecentLifecycleMovement(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  limit: number,
): Promise<LifecycleMovementItemDto[]> {
  // RBAC na relação contact — MEMBER só vê transições de contatos atribuídos a ele.
  // Entradas BACKFILL refletem histórico real de negócio reconstruído e permanecem na timeline.
  const records = await db.contactLifecycleHistory.findMany({
    where: {
      organizationId: orgId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
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
    take: limit,
  })

  // Schema não define relação `changedByUser`, então resolvemos os nomes em batch
  // apenas quando há IDs presentes (evita query desnecessária quando todas as causas
  // são automáticas, ex.: AI_QUALIFICATION/DEAL_*).
  const userIds = Array.from(
    new Set(
      records
        .map((record) => record.changedByUserId)
        .filter((changedByUserId): changedByUserId is string => changedByUserId !== null),
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
      ? userNameMap.get(record.changedByUserId) ?? null
      : null

    return {
      id: record.id,
      contactId: record.contact.id,
      contactName: record.contact.name,
      contactAvatarUrl: null,
      fromStage: record.fromStage,
      toStage: record.toStage,
      causeType: record.causeType,
      causeLabel: mapCauseTypeToLabel(record.causeType, changedByName),
      changedByName,
      createdAt: record.createdAt,
    }
  })
}

export const getRecentLifecycleMovement = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
  ): Promise<LifecycleMovementItemDto[]> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () =>
        fetchRecentLifecycleMovement(
          ctx.orgId,
          ctx.userId,
          elevated,
          dateRange,
          RECENT_MOVEMENT_LIMIT,
        ),
      makeDashboardV2CacheKey('recent-movement', ctx, dateRange),
      {
        tags: [`dashboard:${ctx.orgId}`, `contacts:${ctx.orgId}`],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
