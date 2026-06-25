import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getSegments } from '@/_data-access/segment/get-segments'
import { checkPlanQuota, getPlanLimits } from '@/_lib/rbac/plan-limits'
import { isElevated } from '@/_lib/rbac'
import { SCORE_ELIGIBLE_PRODUCT_KEYS } from '@/../trigger/lib/health-score-constants'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { resolveContactCapabilities } from '@/_lib/contact/contact-capabilities'
import { ContactCapabilitiesProvider } from '@/_components/contacts/_lib/contact-capabilities-context'
import { SegmentsListClient } from '@/_components/segments/_components/segments-list-client'

interface SegmentsPageProps {
  params: Promise<{ orgSlug: string }>
  // Produto que renderiza a tela (crm | prospection | inbox | agents)
  basePath?: string
}

const SegmentsPage = async ({
  params,
  basePath = 'crm',
}: SegmentsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Gerência de segmentação é administrativa (espelha Campos Personalizados)
  if (!isElevated(ctx.userRole)) {
    redirect(`/org/${orgSlug}/${basePath}/home`)
  }

  const [segments, quota, planInfo, orgModules] = await Promise.all([
    getSegments(ctx),
    checkPlanQuota(ctx.orgId, 'segment'),
    getPlanLimits(ctx.orgId),
    getOrgModules(ctx.orgId),
  ])

  const isScoreEnabled = planInfo.plan
    ? (SCORE_ELIGIBLE_PRODUCT_KEYS as readonly string[]).includes(planInfo.plan)
    : false

  const capabilities = resolveContactCapabilities(
    orgModules.map((mod) => mod.slug),
  )

  return (
    <ContactCapabilitiesProvider
      capabilities={capabilities}
      basePath={basePath}
    >
      <SegmentsListClient
        segments={segments}
        isScoreEnabled={isScoreEnabled}
        withinQuota={quota.withinQuota}
        current={quota.current}
        limit={quota.limit}
      />
    </ContactCapabilitiesProvider>
  )
}

export default SegmentsPage
