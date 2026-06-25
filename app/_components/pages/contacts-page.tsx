import { EntityType } from '@prisma/client'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getContactsPaginated } from '@/_data-access/contact/get-contacts'
import { getContactsLifecycleCounts } from '@/_data-access/contact/get-contacts-lifecycle-counts'
import { getCompanies } from '@/_data-access/company/get-companies'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { checkPlanQuota, getPlanLimits } from '@/_lib/rbac/plan-limits'
import { SCORE_ELIGIBLE_PRODUCT_KEYS } from '@/../trigger/lib/health-score-constants'
import { getDefaultPipelineWithStages } from '@/_data-access/pipeline/get-default-pipeline-with-stages'
import { getTutorialCompletions } from '@/_data-access/tutorial/get-tutorial-completions'
import { getFieldDefinitions } from '@/_data-access/field-definition/get-field-definitions'
import { LifecycleIntroTrigger } from '@/_components/tutorials/lifecycle-intro-trigger'
import { ContactsListClient } from '@/_components/contacts/_components/contacts-list-client'
import { parseContactListParams } from '@/_components/contacts/_lib/contact-list-params'
import { getOrgModules } from '@/_data-access/module/get-org-modules'
import { resolveContactCapabilities } from '@/_lib/contact/contact-capabilities'
import { ContactCapabilitiesProvider } from '@/_components/contacts/_lib/contact-capabilities-context'

interface ContactsPageProps {
  params: Promise<{ orgSlug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
  // Produto que está renderizando a tela (crm | prospection | inbox | agents).
  // Usado para montar links internos de contato relativos ao produto.
  basePath?: string
}

const ContactsPage = async ({
  params,
  searchParams,
  basePath = 'crm',
}: ContactsPageProps) => {
  const { orgSlug } = await params
  const resolvedSearchParams = await searchParams
  const ctx = await getOrgContext(orgSlug)
  const listParams = parseContactListParams(resolvedSearchParams)

  const [
    result,
    companies,
    quota,
    members,
    planInfo,
    lifecycleCounts,
    pipelineStages,
    completedTutorialIds,
    allFieldDefinitions,
    orgModules,
  ] = await Promise.all([
    getContactsPaginated(ctx, listParams),
    getCompanies(ctx.orgId),
    checkPlanQuota(ctx.orgId, 'contact'),
    getOrganizationMembers(ctx.orgId),
    getPlanLimits(ctx.orgId),
    getContactsLifecycleCounts(ctx, listParams),
    getDefaultPipelineWithStages(ctx.orgId),
    getTutorialCompletions(ctx.userId, ctx.orgId),
    getFieldDefinitions(ctx.orgId, EntityType.CONTACT),
    getOrgModules(ctx.orgId),
  ])

  const customFieldDefinitions = allFieldDefinitions.filter(
    (definition) => !definition.isSystem,
  )

  const isScoreEnabled = planInfo.plan
    ? (SCORE_ELIGIBLE_PRODUCT_KEYS as readonly string[]).includes(planInfo.plan)
    : false

  // Borda: traduz módulos da org → capabilities do contato (único lugar)
  const capabilities = resolveContactCapabilities(
    orgModules.map((mod) => mod.slug),
  )

  return (
    <ContactCapabilitiesProvider
      capabilities={capabilities}
      basePath={basePath}
    >
      <ContactsListClient
        contacts={result.data}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        totalPages={result.totalPages}
        companyOptions={companies}
        members={members.accepted}
        currentUserId={ctx.userId}
        userRole={ctx.userRole}
        withinQuota={quota.withinQuota}
        orgSlug={orgSlug}
        hidePiiFromMembers={ctx.hidePiiFromMembers ?? false}
        isScoreEnabled={isScoreEnabled}
        lifecycleCounts={lifecycleCounts}
        pipelineStages={pipelineStages}
        customFieldDefinitions={customFieldDefinitions}
      />
      <LifecycleIntroTrigger
        hasSeenLifecycleIntro={completedTutorialIds.includes('lifecycle-intro')}
      />
    </ContactCapabilitiesProvider>
  )
}

export default ContactsPage
