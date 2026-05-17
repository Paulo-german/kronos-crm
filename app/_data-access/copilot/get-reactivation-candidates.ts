import 'server-only'
import { unstable_cache } from 'next/cache'
import { db } from '@/_lib/prisma'
import type { Prisma } from '@prisma/client'
import type { RBACContext } from '@/_lib/rbac'
import { isElevated } from '@/_lib/rbac'
import { maskEmail, maskPhone } from '@/_lib/pii-mask'
import type {
  ReactivationCandidateDto,
  ReactivationCandidatesResult,
  ReactivationParams,
} from './shared/insights-types'
import { makeInsightsCacheKey } from './shared/insights-cache'

const DAY_MS = 24 * 60 * 60 * 1000

interface WonDealRow {
  value: Prisma.Decimal | null
  title: string
  updatedAt: Date
}

interface EnrichedCandidate {
  dto: ReactivationCandidateDto
  lastWonAtMs: number | null
}

const fetchReactivationCandidatesFromDb = async (
  orgId: string,
  userId: string,
  elevated: boolean,
  hidePiiFromMembers: boolean,
  params: ReactivationParams,
): Promise<ReactivationCandidatesResult> => {
  const masked = !elevated && hidePiiFromMembers

  const where: Prisma.ContactWhereInput = {
    organizationId: orgId,
    lifecycleStage: 'CUSTOMER',
    customerStatus: 'DORMANT',
    ...(elevated ? {} : { assignedTo: userId }),
  }

  // Pegamos todos os DORMANT candidates + seus deals WON e calculamos LTV em memória.
  // O minLtv funciona como filtro pós-agregação — o `some` na query apenas garante
  // que existe pelo menos um WON, evitando trazer contatos sem histórico de compra.
  const contacts = await db.contact.findMany({
    where: {
      ...where,
      deals: { some: { deal: { status: 'WON' } } },
    },
    include: {
      assignee: { select: { id: true, fullName: true } },
      deals: {
        where: { deal: { status: 'WON' } },
        include: {
          deal: { select: { value: true, title: true, updatedAt: true } },
        },
      },
    },
  })

  const now = Date.now()

  const enriched: EnrichedCandidate[] = contacts
    .map((contact): EnrichedCandidate => {
      const wonDeals: WonDealRow[] = contact.deals.map((join) => join.deal)
      const ltvBrl = wonDeals.reduce((acc, deal) => acc + (deal.value !== null ? Number(deal.value) : 0), 0)

      let lastWon: WonDealRow | null = null
      for (const deal of wonDeals) {
        if (!lastWon || deal.updatedAt > lastWon.updatedAt) {
          lastWon = deal
        }
      }

      const daysSinceLastPurchase = lastWon
        ? Math.floor((now - lastWon.updatedAt.getTime()) / DAY_MS)
        : null

      return {
        lastWonAtMs: lastWon ? lastWon.updatedAt.getTime() : null,
        dto: {
          id: contact.id,
          name: contact.name,
          email: masked ? maskEmail(contact.email) : contact.email,
          phone: masked ? maskPhone(contact.phone) : contact.phone,
          ltvBrl,
          daysSinceLastPurchase,
          lastWonDealTitle: lastWon?.title ?? null,
          assignedTo: contact.assignedTo,
          assignedToName: contact.assignee?.fullName ?? null,
        },
      }
    })
    .filter((row) => row.dto.ltvBrl >= params.minLtv)

  if (params.sort === 'ltvDesc') {
    enriched.sort((a, b) => b.dto.ltvBrl - a.dto.ltvBrl)
  }
  if (params.sort === 'recentlyDormantDesc') {
    // Sem campo "dormant_at" — proxy: deals WON mais recentes primeiro
    enriched.sort((a, b) => (b.lastWonAtMs ?? 0) - (a.lastWonAtMs ?? 0))
  }

  const total = enriched.length
  const start = (params.page - 1) * params.pageSize
  const paged = enriched.slice(start, start + params.pageSize).map((row) => row.dto)

  return { data: paged, total }
}

export const getReactivationCandidates = async (
  ctx: RBACContext,
  params: ReactivationParams,
): Promise<ReactivationCandidatesResult> => {
  const elevated = isElevated(ctx.userRole)
  const hidePiiFromMembers = ctx.hidePiiFromMembers ?? false

  const paramsKey = JSON.stringify({
    page: params.page,
    pageSize: params.pageSize,
    minLtv: params.minLtv,
    sort: params.sort,
  })

  const getCached = unstable_cache(
    async () =>
      fetchReactivationCandidatesFromDb(
        ctx.orgId,
        ctx.userId,
        elevated,
        hidePiiFromMembers,
        params,
      ),
    makeInsightsCacheKey('reactivation', ctx, paramsKey),
    {
      tags: [`copilot:${ctx.orgId}`],
      revalidate: 3600,
    },
  )

  return getCached()
}
