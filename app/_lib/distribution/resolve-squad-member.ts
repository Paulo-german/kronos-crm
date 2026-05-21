import 'server-only'
import { redis } from '@/_lib/redis'
import { db } from '@/_lib/prisma'
import type { SalesDistributionModel } from '@prisma/client'

interface ResolveResult {
  userId: string
  squadId: string
}

interface ResolveOptions {
  orgId: string
  squadId?: string | null
  contactCurrentAssignedTo?: string | null
}

/**
 * Seleciona um membro ativo do squad e retorna o userId a ser atribuído.
 * Hierarquia de fallback: squad explícito → squad SALES padrão → squad padrão → OWNER da org.
 */
export async function resolveSquadMember(options: ResolveOptions): Promise<ResolveResult | null> {
  const { orgId, squadId: requestedSquadId, contactCurrentAssignedTo } = options

  const squad = await resolveSquad(orgId, requestedSquadId)
  if (!squad) return null

  const activeUserIds = squad.members
    .filter((member) => member.isActive && member.member.userId)
    .map((member) => member.member.userId as string)

  if (activeUserIds.length === 0) return null

  const userId = await selectMember({
    squadId: squad.id,
    orgId,
    model: squad.distributionModel,
    userIds: activeUserIds,
    contactCurrentAssignedTo,
  })

  if (!userId) return null

  return { userId, squadId: squad.id }
}

async function resolveSquad(orgId: string, squadId?: string | null) {
  if (squadId) {
    return db.squad.findFirst({
      where: { id: squadId, organizationId: orgId },
      select: squadSelectShape,
    })
  }

  const salesDefault = await db.squad.findFirst({
    where: { organizationId: orgId, type: 'SALES', isDefault: true },
    select: squadSelectShape,
  })
  if (salesDefault) return salesDefault

  return db.squad.findFirst({
    where: { organizationId: orgId, isDefault: true },
    select: squadSelectShape,
  })
}

const squadSelectShape = {
  id: true,
  distributionModel: true,
  members: {
    where: { isActive: true },
    select: {
      isActive: true,
      member: { select: { userId: true } },
    },
  },
} as const

interface SelectMemberOptions {
  squadId: string
  orgId: string
  model: SalesDistributionModel
  userIds: string[]
  contactCurrentAssignedTo?: string | null
}

async function selectMember(options: SelectMemberOptions): Promise<string | null> {
  const { squadId, orgId, model, userIds, contactCurrentAssignedTo } = options

  if (model === 'MANUAL') return null

  if (model === 'LOYALTY') {
    if (contactCurrentAssignedTo && userIds.includes(contactCurrentAssignedTo)) {
      return contactCurrentAssignedTo
    }
    return roundRobin(squadId, userIds)
  }

  if (model === 'UTILIZATION') {
    return utilization(orgId, userIds)
  }

  return roundRobin(squadId, userIds)
}

async function roundRobin(squadId: string, userIds: string[]): Promise<string> {
  try {
    const counter = await redis.incr(`distribution:squad:${squadId}:index`)
    const index = (counter - 1) % userIds.length
    return userIds[index]
  } catch {
    return userIds[0]
  }
}

async function utilization(orgId: string, userIds: string[]): Promise<string> {
  const openDealCounts = await db.deal.groupBy({
    by: ['assignedTo'],
    where: { organizationId: orgId, assignedTo: { in: userIds }, status: 'OPEN' },
    _count: { id: true },
  })

  const countMap = new Map(openDealCounts.map((row) => [row.assignedTo, row._count.id]))

  let minCount = Infinity
  let selected = userIds[0]

  for (const userId of userIds) {
    const count = countMap.get(userId) ?? 0
    if (count < minCount) {
      minCount = count
      selected = userId
    }
  }

  return selected
}
