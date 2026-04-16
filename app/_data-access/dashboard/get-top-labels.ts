import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { buildInboxDashboardWhere } from './build-inbox-dashboard-where'
import type { DateRange } from './types'
import type { InboxDashboardFilters, TopLabel } from './inbox-dashboard-types'

const CACHE_REVALIDATE_SECONDS = 3600
const MAX_TOP_LABELS = 10

async function fetchTopLabels(
  orgId: string,
  userId: string,
  elevated: boolean,
  dateRange: DateRange,
  filters: InboxDashboardFilters,
): Promise<TopLabel[]> {
  const baseWhere = buildInboxDashboardWhere(orgId, userId, elevated, filters)

  // groupBy em ConversationLabelAssignment filtrando pelas conversas do período e RBAC
  const groups = await db.conversationLabelAssignment.groupBy({
    by: ['labelId'],
    _count: { _all: true },
    where: {
      conversation: {
        ...baseWhere,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    },
    orderBy: { _count: { labelId: 'desc' } },
    take: MAX_TOP_LABELS,
  })

  if (groups.length === 0) return []

  const labelIds = groups.map((group) => group.labelId)

  const labels = await db.conversationLabel.findMany({
    where: { id: { in: labelIds } },
    select: { id: true, name: true, color: true },
  })

  const labelMap = new Map(labels.map((label) => [label.id, label]))

  return groups
    .map((group) => {
      const label = labelMap.get(group.labelId)
      if (!label) return null

      return {
        labelId: group.labelId,
        labelName: label.name,
        labelColor: label.color,
        count: group._count._all,
      }
    })
    .filter((entry): entry is TopLabel => entry !== null)
}

export const getTopLabels = cache(
  async (
    ctx: RBACContext,
    dateRange: DateRange,
    filters: InboxDashboardFilters,
  ): Promise<TopLabel[]> => {
    const elevated = isElevated(ctx.userRole)
    const startISO = dateRange.start.toISOString()
    const endISO = dateRange.end.toISOString()
    const filtersKey = JSON.stringify({
      ch: filters.channel ?? '',
      as: filters.assignee ?? '',
      la: filters.labelId ?? '',
      st: filters.status ?? '',
      ai: filters.aiVsHuman ?? '',
    })

    const getCached = unstable_cache(
      async () =>
        fetchTopLabels(ctx.orgId, ctx.userId, elevated, dateRange, filters),
      [
        `inbox-labels-${ctx.orgId}-${ctx.userId}-${elevated}-${startISO}-${endISO}-${filtersKey}`,
      ],
      {
        tags: [`conversations:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
