import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { TaskType } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated } from '@/_lib/rbac'
import type { RBACContext } from '@/_lib/rbac'
import { makeReportsCacheKey } from '../shared/reports-cache'
import type { DateRange } from '../shared/reports-types'

const CACHE_REVALIDATE_SECONDS = 3600

export interface TeamMemberTaskBreakdownItem {
  type: TaskType
  count: number
}

async function fetchTeamMemberTaskBreakdown(
  orgId: string,
  memberId: string,
  dateRange: DateRange,
): Promise<TeamMemberTaskBreakdownItem[]> {
  // Convenção do projeto: "tarefa concluída no período" = isCompleted=true AND dueDate ∈ [start, end].
  // Motivo: o model Task não possui campo completedAt — apenas isCompleted (boolean) + dueDate.
  const rows = await db.crmTask.groupBy({
    by: ['type'],
    _count: { id: true },
    where: {
      organizationId: orgId,
      assignedTo: memberId,
      isCompleted: true,
      dueDate: { gte: dateRange.start, lte: dateRange.end },
    },
  })

  // Inicializa todos os tipos com 0 para a UI poder renderizar uma lista estável (mesma ordem sempre).
  const countByType = new Map(rows.map((row) => [row.type, row._count.id]))
  return Object.values(TaskType).map((type) => ({
    type,
    count: countByType.get(type) ?? 0,
  }))
}

export const getTeamMemberTaskBreakdown = cache(
  async (
    ctx: RBACContext,
    memberId: string,
    dateRange: DateRange,
  ): Promise<TeamMemberTaskBreakdownItem[]> => {
    // Defense-in-depth: MEMBER só pode ver os PRÓPRIOS dados (page.tsx já redireciona não-elevados,
    // mas mantemos o guard aqui para garantir mesmo em chamadas diretas).
    const elevated = isElevated(ctx.userRole)
    if (!elevated && memberId !== ctx.userId) return []

    const getCached = unstable_cache(
      async () => fetchTeamMemberTaskBreakdown(ctx.orgId, memberId, dateRange),
      makeReportsCacheKey('team-member-task-breakdown', ctx, dateRange, { memberId }),
      {
        tags: [`reports:${ctx.orgId}`, `tasks:${ctx.orgId}`],
        revalidate: CACHE_REVALIDATE_SECONDS,
      },
    )

    return getCached()
  },
)
