import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getCaptureFormsByOrg } from '@/_data-access/capture-form/get-capture-forms'
import { getOrganizationBySlug } from '@/_data-access/organization/get-organization-by-slug'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getSquads } from '@/_data-access/squad/get-squads'
import { getFieldDefinitions } from '@/_data-access/field-definition/get-field-definitions'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { QuotaHint } from '@/_components/trial/quota-hint'
import { BackButton } from '@/_components/layout/back-button'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { CaptureFormsDataTable } from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/capture-forms/_components/capture-forms-data-table'
import CreateCaptureFormButton from '@/(authenticated)/org/[orgSlug]/(crm)/crm/settings/capture-forms/_components/create-capture-form-button'

interface CaptureFormsPageProps {
  params: Promise<{ orgSlug: string }>
}

const CaptureFormsPage = async ({ params }: CaptureFormsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/crm/home`)
  }

  const [forms, members, squads, quota, fieldDefinitions, org] =
    await Promise.all([
      getCaptureFormsByOrg(ctx.orgId),
      getOrganizationMembers(ctx.orgId),
      getSquads(ctx),
      checkPlanQuota(ctx.orgId, 'capture_form'),
      getFieldDefinitions(ctx.orgId, 'CONTACT'),
      getOrganizationBySlug(orgSlug),
    ])

  const privacyPolicyUrl = org?.privacyPolicyUrl ?? null

  return (
    <div className="container mx-auto space-y-6 py-6">
      <BackButton href={`/org/${orgSlug}/crm/settings`} />
      <Header>
        <HeaderLeft>
          <HeaderTitle>Formulários de Captura</HeaderTitle>
          <HeaderSubTitle>
            Crie formulários embeddable para capturar leads diretamente no seu
            site.
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="capture_form" />
        </HeaderLeft>
        <HeaderRight>
          <CreateCaptureFormButton
            withinQuota={quota.withinQuota}
            members={members.accepted}
            squads={squads}
            fieldDefinitions={fieldDefinitions}
            privacyPolicyUrl={privacyPolicyUrl}
          />
        </HeaderRight>
      </Header>

      <CaptureFormsDataTable
        forms={forms}
        members={members.accepted}
        squads={squads}
        fieldDefinitions={fieldDefinitions}
        privacyPolicyUrl={privacyPolicyUrl}
      />
    </div>
  )
}

export default CaptureFormsPage
