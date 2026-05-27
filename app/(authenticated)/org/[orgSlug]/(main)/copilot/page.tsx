import { redirect } from 'next/navigation'
import type { LifecycleStage } from '@prisma/client'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { getOrgInsightsOverview } from '@/_data-access/copilot/get-org-insights-overview'
import { getContactsAtRisk } from '@/_data-access/copilot/get-contacts-at-risk'
import { getStalledDeals } from '@/_data-access/copilot/get-stalled-deals'
import { getReactivationCandidates } from '@/_data-access/copilot/get-reactivation-candidates'
import type { ContactsAtRiskParams } from '@/_data-access/copilot/shared/insights-types'
import {
  STALE_DEAL_DAYS,
  REACTIVATION_MIN_LTV,
  DEFAULT_PAGE_SIZE,
} from './_lib/score-thresholds'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
  HeaderRight,
} from '@/_components/header'
import { ScoreFreshnessHint } from './_components/score-freshness-hint'
import { InsightsOverviewCard } from './_components/insights-overview-card'
import { InsightsTabs } from './_components/insights-tabs'
import AnimatedSection from './_components/animated-section'

const VALID_SORT_OPTIONS = ['scoreAsc', 'ltvDesc', 'recencyAsc'] as const
const VALID_STAGES: LifecycleStage[] = ['LEAD', 'QUALIFIED', 'OPPORTUNITY', 'CUSTOMER']

interface CopilotPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// feat desativada temporariamente — remover este componente e restaurar CopilotPageFull para reativar
export default async function CopilotPage({ params }: CopilotPageProps) {
  const { orgSlug } = await params
  redirect(`/org/${orgSlug}/dashboard`)
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function CopilotPageFull({ params, searchParams }: CopilotPageProps) {
  const { orgSlug } = await params
  const sp = await searchParams
  const ctx = await getOrgContext(orgSlug)

  const { plan } = await getPlanLimits(ctx.orgId)
  if (plan !== 'scale' && plan !== 'enterprise') {
    redirect(`/org/${orgSlug}/plans`)
  }

  const rawSort = typeof sp.sort === 'string' ? sp.sort : 'scoreAsc'
  const sort = (VALID_SORT_OPTIONS as readonly string[]).includes(rawSort)
    ? (rawSort as ContactsAtRiskParams['sort'])
    : 'scoreAsc'

  const rawStage = typeof sp.stage === 'string' ? sp.stage : undefined
  const stage = rawStage && (VALID_STAGES as string[]).includes(rawStage)
    ? (rawStage as LifecycleStage)
    : undefined

  const rawPage = typeof sp.page === 'string' ? parseInt(sp.page, 10) : 1
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1

  const [overview, atRisk, stalled, reactivation] = await Promise.all([
    getOrgInsightsOverview(ctx),
    getContactsAtRisk(ctx, {
      page,
      pageSize: DEFAULT_PAGE_SIZE,
      sort,
      stage,
    }),
    getStalledDeals(ctx, {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      staleAfterDays: STALE_DEAL_DAYS,
      sort: 'staleDesc',
    }),
    getReactivationCandidates(ctx, {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      minLtv: REACTIVATION_MIN_LTV,
      sort: 'ltvDesc',
    }),
  ])

  return (
    <div className="flex h-full flex-col gap-6">
      <AnimatedSection delay={0}>
        <Header>
          <HeaderLeft>
            <HeaderTitle>Copiloto</HeaderTitle>
            <HeaderSubTitle>O que você faz hoje</HeaderSubTitle>
          </HeaderLeft>
          <HeaderRight>
            <ScoreFreshnessHint scoredAt={overview.scoredAt} />
          </HeaderRight>
        </Header>
      </AnimatedSection>

      <AnimatedSection delay={0.08}>
        <InsightsOverviewCard overview={overview} />
      </AnimatedSection>

      <AnimatedSection delay={0.16}>
        <InsightsTabs
          atRisk={atRisk}
          stalled={stalled}
          reactivation={reactivation}
          counts={overview.counts}
          totalAtRisk={overview.customers.atRisk + overview.pipeline.atRisk}
          orgSlug={orgSlug}
        />
      </AnimatedSection>
    </div>
  )
}
