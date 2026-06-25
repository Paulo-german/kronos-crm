import { redirect } from 'next/navigation'
import { EntityType } from '@prisma/client'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getFieldDefinitions } from '@/_data-access/field-definition/get-field-definitions'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { FieldDefinitionsTable } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/custom-fields/_components/field-definitions-table'

interface DealFieldsPageProps {
  params: Promise<{ orgSlug: string }>
}

const DealFieldsPage = async ({ params }: DealFieldsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Guard de RBAC: apenas OWNER/ADMIN podem gerenciar campos personalizados
  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [definitions, quota] = await Promise.all([
    getFieldDefinitions(ctx.orgId, EntityType.DEAL),
    checkPlanQuota(ctx.orgId, 'custom_field'),
  ])

  return (
    <FieldDefinitionsTable
      definitions={definitions}
      entityType={EntityType.DEAL}
      withinQuota={quota.withinQuota}
      quotaCurrent={quota.current}
      quotaLimit={quota.limit}
    />
  )
}

export default DealFieldsPage
