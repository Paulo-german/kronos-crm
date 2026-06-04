import { redirect } from 'next/navigation'
import { EntityType } from '@prisma/client'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getFieldDefinitions } from '@/_data-access/field-definition/get-field-definitions'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { BackButton } from '@/_components/layout/back-button'
import { FieldDefinitionsTable } from '@/(authenticated)/org/[orgSlug]/(main)/settings/custom-fields/_components/field-definitions-table'

interface ContactFieldsPageProps {
  params: Promise<{ orgSlug: string }>
}

const ContactFieldsPage = async ({ params }: ContactFieldsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Guard de RBAC: apenas OWNER/ADMIN podem gerenciar campos personalizados
  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [definitions, quota] = await Promise.all([
    getFieldDefinitions(ctx.orgId, EntityType.CONTACT),
    checkPlanQuota(ctx.orgId, 'custom_field'),
  ])

  return (
    <>
      <div className="px-6 pt-6">
        <BackButton href={`/org/${orgSlug}/crm/settings`} />
      </div>
      <FieldDefinitionsTable
        definitions={definitions}
        entityType={EntityType.CONTACT}
        withinQuota={quota.withinQuota}
        quotaCurrent={quota.current}
        quotaLimit={quota.limit}
      />
    </>
  )
}

export default ContactFieldsPage
