import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { subMonths } from 'date-fns'
import { db } from '@/_lib/prisma'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface RoutingWorkerStat {
  agentId: string
  agentName: string
  isCurrentMember: boolean
  count: number
  share: number
}

export interface AgentGroupRoutingStatsDto {
  totalRoutings: number
  totalRoutingsAllTime: number
  routingsWithMetadata: number
  fallbackRate: number
  avgConfidence: number
  workers: RoutingWorkerStat[]
}

// ---------------------------------------------------------------------------
// Tipos auxiliares para parsing do metadata JSON
// ---------------------------------------------------------------------------

interface RouterExecutionMetadata {
  targetAgentId?: string
  confidence?: number
  wasFallback?: boolean
}

function parseRouterMetadata(raw: unknown): RouterExecutionMetadata {
  if (!raw || typeof raw !== 'object') return {}
  const m = raw as Record<string, unknown>
  return {
    targetAgentId: typeof m.targetAgentId === 'string' ? m.targetAgentId : undefined,
    confidence: typeof m.confidence === 'number' ? m.confidence : undefined,
    wasFallback: typeof m.wasFallback === 'boolean' ? m.wasFallback : undefined,
  }
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchAgentGroupRoutingStats(
  groupId: string,
): Promise<AgentGroupRoutingStatsDto> {
  const thirtyDaysAgo = subMonths(new Date(), 1)

  const [routerRows, totalRoutingsAllTime, groupMembers] = await Promise.all([
    db.agentExecution.findMany({
      where: {
        agentGroupId: groupId,
        agentId: null,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { metadata: true },
    }),
    db.agentExecution.count({
      where: { agentGroupId: groupId, agentId: null },
    }),
    db.agentGroupMember.findMany({
      where: { groupId },
      include: {
        agent: { select: { id: true, name: true } },
      },
    }),
  ])

  const memberAgentIds = new Set(groupMembers.map((member) => member.agentId))
  const agentNameById = new Map(groupMembers.map((member) => [member.agentId, member.agent.name]))

  // Agregar metadata em memória (JSON não suporta groupBy no Prisma)
  const workerCountMap = new Map<string, number>()
  let fallbackCount = 0
  let confidenceSum = 0
  let confidenceCount = 0
  let routingsWithMetadata = 0

  for (const row of routerRows) {
    const meta = parseRouterMetadata(row.metadata)
    if (!meta.targetAgentId) continue

    routingsWithMetadata++
    workerCountMap.set(meta.targetAgentId, (workerCountMap.get(meta.targetAgentId) ?? 0) + 1)

    if (meta.wasFallback) fallbackCount++

    if (typeof meta.confidence === 'number') {
      confidenceSum += meta.confidence
      confidenceCount++
    }
  }

  const fallbackRate =
    routingsWithMetadata > 0 ? (fallbackCount / routingsWithMetadata) * 100 : 0

  const avgConfidence =
    confidenceCount > 0 ? (confidenceSum / confidenceCount) * 100 : 0

  // Montar lista de workers ordenada por contagem desc
  const workers: RoutingWorkerStat[] = Array.from(workerCountMap.entries())
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([agentId, count]) => ({
      agentId,
      agentName: agentNameById.get(agentId) ?? 'Agente removido',
      isCurrentMember: memberAgentIds.has(agentId),
      count,
      share: routingsWithMetadata > 0 ? (count / routingsWithMetadata) * 100 : 0,
    }))

  return {
    totalRoutings: routerRows.length,
    totalRoutingsAllTime,
    routingsWithMetadata,
    fallbackRate,
    avgConfidence,
    workers,
  }
}

// ---------------------------------------------------------------------------
// Export com cache
// ---------------------------------------------------------------------------

export const getAgentGroupRoutingStats = cache(
  async (groupId: string, orgId: string): Promise<AgentGroupRoutingStatsDto> => {
    const getCached = unstable_cache(
      async () => fetchAgentGroupRoutingStats(groupId),
      [`agent-group-routing-${groupId}`],
      {
        tags: [`agentGroup:${groupId}`, `agentGroups:${orgId}`],
        revalidate: 3600,
      },
    )

    return getCached()
  },
)
