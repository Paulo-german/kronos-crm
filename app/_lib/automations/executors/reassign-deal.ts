import 'server-only'

import { db } from '@/_lib/prisma'
import { revalidateTag } from 'next/cache'
import { Prisma } from '@prisma/client'
import { createNotification } from '@/_lib/notifications/create-notification'
import { getOrgSlug } from '@/_lib/notifications/get-org-slug'
import type { ExecutorContext, ExecutorResult, ReassignDealConfig } from '../types'

/**
 * Seleciona o próximo usuário via round-robin stateless:
 * lê a última execução SUCCESS desta automação para descobrir quem foi o último
 * assignee e avança circularmente no pool.
 */
async function resolveRoundRobinTarget(
  automationId: string,
  filteredPool: string[],
  currentAssignee: string,
  excludeCurrent: boolean,
): Promise<string | null> {
  const lastExecution = await db.automationExecution.findFirst({
    where: {
      automationId,
      status: 'SUCCESS',
      actionResult: { not: Prisma.JsonNull },
    },
    orderBy: { executedAt: 'desc' },
    select: { actionResult: true },
  })

  const pool = excludeCurrent
    ? filteredPool.filter((id) => id !== currentAssignee)
    : filteredPool

  if (pool.length === 0) return null

  const lastAssignedTo =
    lastExecution?.actionResult &&
    typeof lastExecution.actionResult === 'object' &&
    !Array.isArray(lastExecution.actionResult) &&
    'assignedTo' in lastExecution.actionResult
      ? String(lastExecution.actionResult.assignedTo)
      : null

  if (!lastAssignedTo) return pool[0] ?? null

  const lastIndex = pool.indexOf(lastAssignedTo)
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % pool.length
  return pool[nextIndex] ?? null
}

/**
 * Seleciona o usuário do pool com menos deals OPEN ou IN_PROGRESS.
 * Em caso de empate usa a posição no array (primeiro = prioridade).
 */
async function resolveLeastDealsTarget(
  orgId: string,
  filteredPool: string[],
  currentAssignee: string,
  excludeCurrent: boolean,
): Promise<string | null> {
  const pool = excludeCurrent
    ? filteredPool.filter((id) => id !== currentAssignee)
    : filteredPool

  if (pool.length === 0) return null

  const dealCounts = await db.deal.groupBy({
    by: ['assignedTo'],
    where: {
      organizationId: orgId,
      assignedTo: { in: pool },
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
    _count: { _all: true },
  })

  const countMap = new Map(dealCounts.map((row) => [row.assignedTo, row._count._all]))

  // Ordena pelo menor count, mantendo a ordem do pool como critério de desempate
  const sorted = [...pool].sort((a, b) => {
    const countA = countMap.get(a) ?? 0
    const countB = countMap.get(b) ?? 0
    return countA - countB
  })

  return sorted[0] ?? null
}

/**
 * Executor de reatribuição de deal.
 * Suporta as estratégias: round_robin, least_deals e specific_user.
 * Valida o pool contra membros ACCEPTED antes de executar.
 */
export async function executeReassignDeal(ctx: ExecutorContext): Promise<ExecutorResult> {
  const config = ctx.actionConfig as unknown as ReassignDealConfig

  const rawPool = config.targetUserIds ?? []
  const excludeCurrent = config.excludeCurrentAssignee ?? true

  // Filtra o pool para manter apenas membros ACCEPTED ativos na org
  // (previne atribuição para membro removido ou que aceitou o convite)
  const acceptedMembers = await db.member.findMany({
    where: {
      organizationId: ctx.orgId,
      status: 'ACCEPTED',
      userId: rawPool.length > 0 ? { in: rawPool } : undefined,
    },
    select: { userId: true },
  })

  const filteredPool = acceptedMembers
    .map((member) => member.userId)
    .filter((userId): userId is string => userId !== null)

  if (filteredPool.length === 0) {
    throw new Error('Pool de reatribuição vazio: nenhum membro ACCEPTED disponível')
  }

  let targetUserId: string | null = null

  if (config.strategy === 'specific_user') {
    // Usa o primeiro usuário válido do pool (já filtrado como ACCEPTED)
    targetUserId = filteredPool[0] ?? null
  } else if (config.strategy === 'least_deals') {
    targetUserId = await resolveLeastDealsTarget(
      ctx.orgId,
      filteredPool,
      ctx.deal.assignedTo,
      excludeCurrent,
    )
  } else {
    // round_robin (padrão)
    targetUserId = await resolveRoundRobinTarget(
      ctx.automationId,
      filteredPool,
      ctx.deal.assignedTo,
      excludeCurrent,
    )
  }

  if (!targetUserId) {
    throw new Error('Nenhum candidato disponível para reatribuição após aplicar filtros')
  }

  // Sem mudança real: deal já está com o usuário alvo
  if (targetUserId === ctx.deal.assignedTo) {
    return { summary: { skipped: true, reason: 'already_assigned', assignedTo: targetUserId } }
  }

  await db.deal.update({
    where: { id: ctx.deal.id },
    data: { assignedTo: targetUserId },
  })

  await db.activity.create({
    data: {
      type: 'assignee_changed',
      content: `Deal reatribuído automaticamente pela automação "${ctx.automationName}"`,
      dealId: ctx.deal.id,
      // performedBy null = ação de sistema (ver padrão do plano)
      performedBy: null,
      metadata: {
        source: 'automation',
        automationId: ctx.automationId,
        automationName: ctx.automationName,
        previousAssignee: ctx.deal.assignedTo,
        newAssignee: targetUserId,
      },
    },
  })

  // Notifica o novo responsável sem bloquear
  void getOrgSlug(ctx.orgId).then((slug) => {
    void createNotification({
      orgId: ctx.orgId,
      userId: targetUserId,
      type: 'USER_ACTION',
      title: 'Deal atribuído a você',
      body: `O deal "${ctx.deal.title}" foi reatribuído a você pela automação "${ctx.automationName}".`,
      actionUrl: slug ? `/org/${slug}/crm/deals/${ctx.deal.id}` : undefined,
      resourceType: 'deal',
      resourceId: ctx.deal.id,
    })
  })

  revalidateTag(`deals:${ctx.orgId}`)
  revalidateTag(`deal:${ctx.deal.id}`)
  revalidateTag(`pipeline:${ctx.orgId}`)

  return { summary: { assignedTo: targetUserId, strategy: config.strategy } }
}
