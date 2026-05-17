import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { subDays } from 'date-fns'
import { DealStatus, LifecycleStage, type Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import {
  ATTENTION_CARD_LIMIT,
  DASHBOARD_V2_CACHE_REVALIDATE_S,
  STAGNANT_OPPORTUNITY_DAYS,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import { buildContactWhereForDashboardV2 } from './shared/build-contact-where'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'
import type { AttentionContactDto, AttentionListDto } from './shared/attention-types'

// Status de Deal considerados "em jogo" para análise de estagnação
const ACTIVE_DEAL_STATUSES: DealStatus[] = [DealStatus.OPEN, DealStatus.IN_PROGRESS]

// Limite (em dias) acima do qual o card escala de "warning" para "destructive"
const DESTRUCTIVE_STAGNATION_DAYS = 21

const MS_PER_DAY = 1000 * 60 * 60 * 24

// Threshold (em reais) acima do qual a formatação de moeda usa notação compacta
const COMPACT_NOTATION_THRESHOLD = 1_000_000

function formatBRL(value: Prisma.Decimal | number): string {
  const numericValue = Number(value)
  const useCompact = numericValue >= COMPACT_NOTATION_THRESHOLD
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: useCompact ? 'compact' : 'standard',
    maximumFractionDigits: useCompact ? 1 : 0,
  }).format(numericValue)
}

async function fetchStagnantOpportunities(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<AttentionListDto> {
  const now = new Date()
  const stagnantThreshold = subDays(now, STAGNANT_OPPORTUNITY_DAYS)

  const contactWhere = buildContactWhereForDashboardV2(orgId, userId, elevated, {
    lifecycleStage: LifecycleStage.OPPORTUNITY,
  })

  const stagnantDealWhere: Prisma.DealWhereInput = {
    organizationId: orgId,
    status: { in: ACTIVE_DEAL_STATUSES },
    updatedAt: { lt: stagnantThreshold },
  }

  // O Prisma suporta `orderBy` em relações aninhadas: `deals[0]` já é o deal mais antigo
  // para cada contato. O sort app-layer ordena os contatos pelo seu deal mais antigo (o Prisma
  // não permite ordenar `contact.findMany` pelo campo de uma relação aninhada).
  const contactsWhere: Prisma.ContactWhereInput = {
    ...contactWhere,
    deals: { some: { deal: stagnantDealWhere } },
  }

  const [rawContacts, totalCount] = await Promise.all([
    db.contact.findMany({
      where: contactsWhere,
      select: {
        id: true,
        name: true,
        deals: {
          where: { deal: stagnantDealWhere },
          take: 1,
          orderBy: { deal: { updatedAt: 'asc' } },
          select: {
            deal: {
              select: {
                value: true,
                updatedAt: true,
                stage: {
                  select: {
                    pipeline: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
    }),
    db.contact.count({ where: contactsWhere }),
  ])

  // Sort app-layer pelo deal mais antigo de cada contato (ASC) e fatia para o limite
  const sorted = rawContacts
    .filter((contact) => contact.deals.length > 0)
    .sort((contactA, contactB) => {
      const updatedAtA = contactA.deals[0].deal.updatedAt.getTime()
      const updatedAtB = contactB.deals[0].deal.updatedAt.getTime()
      return updatedAtA - updatedAtB
    })
    .slice(0, ATTENTION_CARD_LIMIT)

  const contacts: AttentionContactDto[] = sorted.map((contact) => {
    const oldestDeal = contact.deals[0].deal
    const diffDays = Math.floor((now.getTime() - oldestDeal.updatedAt.getTime()) / MS_PER_DAY)
    const variant: AttentionContactDto['primaryMetricVariant'] =
      diffDays >= DESTRUCTIVE_STAGNATION_DAYS ? 'destructive' : 'warning'

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactAvatarUrl: null,
      primaryMetric: `${diffDays} dias parado`,
      primaryMetricVariant: variant,
      secondaryMetric: `${formatBRL(oldestDeal.value)} · ${oldestDeal.stage.pipeline.name}`,
    }
  })

  return { contacts, totalCount }
}

export const getStagnantOpportunities = cache(
  async (ctx: RBACContext): Promise<AttentionListDto> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => fetchStagnantOpportunities(ctx.orgId, ctx.userId, elevated),
      makeDashboardV2CacheKey('stagnant-opportunities', ctx),
      {
        tags: [
          `dashboard:${ctx.orgId}`,
          `contacts:${ctx.orgId}`,
          `deals:${ctx.orgId}`,
        ],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
