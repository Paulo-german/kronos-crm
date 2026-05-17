import 'server-only'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { subDays } from 'date-fns'
import { CustomerStatus, LifecycleStage, type Prisma } from '@prisma/client'
import { db } from '@/_lib/prisma'
import { isElevated, type RBACContext } from '@/_lib/rbac'
import {
  ATTENTION_CARD_LIMIT,
  DASHBOARD_V2_CACHE_REVALIDATE_S,
  HEALTH_SCORE_RISK_THRESHOLD,
  SCORE_STALE_DAYS,
} from '@/_lib/lifecycle/dashboard-v2-constants'
import { buildContactWhereForDashboardV2 } from './shared/build-contact-where'
import { makeDashboardV2CacheKey } from './shared/dashboard-v2-cache'
import type { AttentionContactDto, AttentionListDto } from './shared/attention-types'

// Labels PT-BR para o secondary metric do card
const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  NEVER_BOUGHT: 'Nunca comprou',
  ACTIVE: 'Ativo',
  DORMANT: 'Dormente',
  CHURNED: 'Perdido',
}

async function fetchAtRiskCustomers(
  orgId: string,
  userId: string,
  elevated: boolean,
): Promise<AttentionListDto> {
  const now = new Date()
  const scoreStaleThreshold = subDays(now, SCORE_STALE_DAYS)

  const contactWhere = buildContactWhereForDashboardV2(orgId, userId, elevated, {
    lifecycleStage: LifecycleStage.CUSTOMER,
  })

  // Critério de risco: healthScore baixo OU customerStatus DORMANT.
  // Usa AND para compor com contactWhere — evita sobrescrever campos com mesmo nome
  // caso buildContactWhereForDashboardV2 venha a incluir OR no futuro.
  const riskWhere: Prisma.ContactWhereInput = {
    OR: [
      { healthScore: { lt: HEALTH_SCORE_RISK_THRESHOLD } },
      { customerStatus: CustomerStatus.DORMANT },
    ],
  }

  const finalWhere: Prisma.ContactWhereInput = { AND: [contactWhere, riskWhere] }

  const [rawContacts, totalCount] = await Promise.all([
    db.contact.findMany({
      where: finalWhere,
      select: {
        id: true,
        name: true,
        healthScore: true,
        scoredAt: true,
        customerStatus: true,
      },
      orderBy: [{ healthScore: { sort: 'asc', nulls: 'last' } }],
      take: ATTENTION_CARD_LIMIT,
    }),
    db.contact.count({ where: finalWhere }),
  ])

  const contacts: AttentionContactDto[] = rawContacts.map((contact) => {
    const isScoreStale =
      contact.scoredAt !== null && contact.scoredAt < scoreStaleThreshold

    // Score numérico tem precedência sobre status DORMANT no label principal
    const primaryMetric = (() => {
      if (contact.healthScore !== null) return `Score ${Math.round(contact.healthScore)}`
      if (contact.customerStatus === CustomerStatus.DORMANT) return 'Dormente'
      return 'Score —'
    })()

    return {
      contactId: contact.id,
      contactName: contact.name,
      contactAvatarUrl: null,
      primaryMetric,
      primaryMetricVariant: 'destructive',
      secondaryMetric: CUSTOMER_STATUS_LABELS[contact.customerStatus],
      isScoreStale,
    }
  })

  return { contacts, totalCount }
}

export const getAtRiskCustomers = cache(
  async (ctx: RBACContext): Promise<AttentionListDto> => {
    const elevated = isElevated(ctx.userRole)
    const getCached = unstable_cache(
      async () => fetchAtRiskCustomers(ctx.orgId, ctx.userId, elevated),
      makeDashboardV2CacheKey('at-risk-customers', ctx),
      {
        tags: [`dashboard:${ctx.orgId}`, `contacts:${ctx.orgId}`],
        revalidate: DASHBOARD_V2_CACHE_REVALIDATE_S,
      },
    )
    return getCached()
  },
)
