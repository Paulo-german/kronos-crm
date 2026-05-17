import 'server-only'
import type { GoalType, GoalScope, Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import type { GoalProgress, GoalProgressBreakdown } from './goal-types'

const DAY_MS = 1000 * 60 * 60 * 24
// Conversão de MRR em valor anualizado para somar com receita one-time na meta de REVENUE
const MONTHS_IN_YEAR = 12
// Teto de exibição do percentual — evita números absurdos em metas batidas dezenas de vezes
const MAX_PERCENT = 999

interface GoalLike {
  type: GoalType
  scope: GoalScope
  targetUserId: string | null
  targetPipelineId: string | null
  periodStart: Date
  periodEnd: Date
  targetValue: number
  organizationId: string
}

interface ComputeGoalProgressInput {
  goal: GoalLike
}

// Filtros de escopo por tipo de entidade — extraímos para evitar repetição entre as queries.

function dealScopeWhere(goal: GoalLike): Prisma.DealWhereInput {
  if (goal.scope === 'PIPELINE' && goal.targetPipelineId) {
    return { stage: { pipelineId: goal.targetPipelineId } }
  }
  if (goal.scope === 'MEMBER' && goal.targetUserId) {
    return { assignedTo: goal.targetUserId }
  }
  return {}
}

function activityScopeWhere(goal: GoalLike): Prisma.ActivityWhereInput {
  if (goal.scope === 'PIPELINE' && goal.targetPipelineId) {
    return { deal: { stage: { pipelineId: goal.targetPipelineId } } }
  }
  if (goal.scope === 'MEMBER' && goal.targetUserId) {
    return { performedBy: goal.targetUserId }
  }
  return {}
}

function conversationScopeWhere(goal: GoalLike): Prisma.ConversationWhereInput {
  if (goal.scope === 'PIPELINE' && goal.targetPipelineId) {
    return { deal: { stage: { pipelineId: goal.targetPipelineId } } }
  }
  if (goal.scope === 'MEMBER' && goal.targetUserId) {
    return { assignedTo: goal.targetUserId }
  }
  return {}
}

function dealClosedWhere(goal: GoalLike): Prisma.DealWhereInput {
  return {
    organizationId: goal.organizationId,
    status: 'WON',
    // Aproximação: usamos updatedAt como proxy do momento de fechamento (não há closedAt no schema).
    updatedAt: { gte: goal.periodStart, lt: goal.periodEnd },
    ...dealScopeWhere(goal),
  }
}

function dealOpenedWhere(goal: GoalLike): Prisma.DealWhereInput {
  return {
    organizationId: goal.organizationId,
    createdAt: { gte: goal.periodStart, lt: goal.periodEnd },
    ...dealScopeWhere(goal),
  }
}

function activityWhere(goal: GoalLike): Prisma.ActivityWhereInput {
  return {
    deal: { organizationId: goal.organizationId },
    createdAt: { gte: goal.periodStart, lt: goal.periodEnd },
    ...activityScopeWhere(goal),
  }
}

function conversationWhere(goal: GoalLike): Prisma.ConversationWhereInput {
  return {
    organizationId: goal.organizationId,
    createdAt: { gte: goal.periodStart, lt: goal.periodEnd },
    ...conversationScopeWhere(goal),
  }
}

export async function computeGoalProgress(
  input: ComputeGoalProgressInput,
): Promise<GoalProgress> {
  const { goal } = input
  const target = Number(goal.targetValue)
  const breakdown: GoalProgressBreakdown = { oneTimeRevenue: null, recurringRevenue: null }

  let actual = 0

  if (goal.type === 'REVENUE') {
    const aggregate = await db.deal.aggregate({
      where: dealClosedWhere(goal),
      _sum: { value: true, mrr: true },
    })
    const oneTime = Number(aggregate._sum.value ?? 0)
    const recurring = Number(aggregate._sum.mrr ?? 0) * MONTHS_IN_YEAR
    breakdown.oneTimeRevenue = oneTime
    breakdown.recurringRevenue = recurring
    actual = oneTime + recurring
  } else if (goal.type === 'DEALS_CLOSED') {
    actual = await db.deal.count({ where: dealClosedWhere(goal) })
  } else if (goal.type === 'DEALS_OPENED') {
    actual = await db.deal.count({ where: dealOpenedWhere(goal) })
  } else if (goal.type === 'ACTIVITIES') {
    actual = await db.activity.count({ where: activityWhere(goal) })
  } else if (goal.type === 'CONVERSATIONS') {
    actual = await db.conversation.count({ where: conversationWhere(goal) })
  }

  const percent = target > 0 ? Math.min(MAX_PERCENT, Math.round((actual / target) * 100)) : 0
  const remaining = Math.max(target - actual, 0)
  const daysRemaining = Math.max(
    0,
    Math.ceil((goal.periodEnd.getTime() - Date.now()) / DAY_MS),
  )

  return { actual, target, percent, remaining, daysRemaining, breakdown }
}
