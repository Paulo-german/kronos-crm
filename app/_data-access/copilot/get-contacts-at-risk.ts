import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone } from '@/_lib/pii-mask'
import { SCORE_YELLOW_MAX } from '@/../trigger/lib/health-score-constants'
import type { ContactAtRiskDto, ContactsAtRiskParams, ContactsAtRiskResult } from './shared/insights-types'
import { makeInsightsCacheKey } from './shared/insights-cache'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Shape parcial do snapshot persistido em ContactScoreHistory.snapshot.
 * O contrato completo vive em trigger/lib/health-score-types.ts (ScoreSnapshot);
 * aqui só extraímos os dois campos consumidos pela UI.
 */
type ScoreSnapshotPartial = {
  mainDriver?: string
  mainDriverKey?: string
} & Record<string, unknown>

function extractSnapshot(value: Prisma.JsonValue | null): ScoreSnapshotPartial {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as ScoreSnapshotPartial
}

const ORDER_BY_MAP: Record<
  ContactsAtRiskParams['sort'],
  Prisma.ContactOrderByWithRelationInput
> = {
  scoreAsc: { healthScore: 'asc' },
  // LTV não é denormalizado em Contact — fallback seguro: pior score primeiro
  ltvDesc: { healthScore: 'asc' },
  recencyAsc: { lastInteractionAt: 'asc' },
}

const fetchContactsAtRiskFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
  params: ContactsAtRiskParams,
): Promise<ContactsAtRiskResult> => {
  const masked = !elevated && hidePiiFromMembers
  const scoreMax = params.scoreMax ?? SCORE_YELLOW_MAX

  const where: Prisma.ContactWhereInput = {
    organizationId: orgId,
    healthScore: { lte: scoreMax, not: null },
    scoredAt: { not: null },
    ...(elevated ? {} : { assignedTo: userId }),
    ...(params.stage ? { lifecycleStage: params.stage } : {}),
  }

  const [total, contacts] = await Promise.all([
    db.contact.count({ where }),
    db.contact.findMany({
      where,
      include: {
        assignee: { select: { id: true, fullName: true } },
      },
      orderBy: ORDER_BY_MAP[params.sort],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
  ])

  // Snapshot mais recente por contato — usamos distinct para evitar N+1
  const contactIds = contacts.map((contact) => contact.id)
  const latestSnapshots = contactIds.length
    ? await db.contactScoreHistory.findMany({
        where: { contactId: { in: contactIds }, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        distinct: ['contactId'],
        select: { contactId: true, snapshot: true },
      })
    : []

  const snapshotByContact = new Map<string, ScoreSnapshotPartial>()
  for (const row of latestSnapshots) {
    snapshotByContact.set(row.contactId, extractSnapshot(row.snapshot))
  }

  const now = Date.now()

  const data: ContactAtRiskDto[] = contacts.map((contact) => {
    const snapshot = snapshotByContact.get(contact.id) ?? {}
    const lastInteractionAt = contact.lastInteractionAt
    const daysSinceLastInteraction = lastInteractionAt
      ? Math.floor((now - lastInteractionAt.getTime()) / DAY_MS)
      : null

    // healthScore e scoredAt são garantidos pelo where; narrow para number/Date
    const healthScore = contact.healthScore ?? 0
    const scoredAt = contact.scoredAt ?? new Date(0)

    return {
      id: contact.id,
      name: contact.name,
      email: masked ? maskEmail(contact.email) : contact.email,
      phone: masked ? maskPhone(contact.phone) : contact.phone,
      lifecycleStage: contact.lifecycleStage,
      customerStatus: contact.customerStatus,
      healthScore: Math.round(healthScore),
      scoredAt,
      mainDriver: snapshot.mainDriver ?? '—',
      mainDriverKey: snapshot.mainDriverKey ?? 'recency',
      ltvBrl: 0,
      assignedTo: contact.assignedTo,
      assignedToName: contact.assignee?.fullName ?? null,
      daysSinceLastInteraction,
    }
  })

  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  }
}

export const getContactsAtRisk = async (
  ctx: RBACContext,
  params: ContactsAtRiskParams,
): Promise<ContactsAtRiskResult> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
    stage: params.stage ?? '',
    scoreMax: params.scoreMax ?? SCORE_YELLOW_MAX,
  })

  const getCached = unstable_cache(
    async () =>
      fetchContactsAtRiskFromDb(ctx.orgId, ctx.userId, elevated, hidePiiFromMembers, params),
    makeInsightsCacheKey('at-risk', ctx, paramsKey),
    {
      tags: [`copilot:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
