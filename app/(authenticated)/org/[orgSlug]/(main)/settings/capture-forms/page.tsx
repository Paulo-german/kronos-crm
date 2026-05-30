import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getCaptureFormsByOrg } from '@/_data-access/capture-form/get-capture-forms'
import { getOrganizationMembers } from '@/_data-access/organization/get-organization-members'
import { getSquads } from '@/_data-access/squad/get-squads'
import { checkPlanQuota } from '@/_lib/rbac/plan-limits'
import { Button } from '@/_components/ui/button'
import { QuotaHint } from '@/_components/trial/quota-hint'
import Header, { HeaderLeft, HeaderRight, HeaderTitle, HeaderSubTitle } from '@/_components/header'
import { CaptureFormsDataTable } from './_components/capture-forms-data-table'
import CreateCaptureFormButton from './_components/create-capture-form-button'

interface CaptureFormsPageProps {
  params: Promise<{ orgSlug: string }>
}

const CaptureFormsPage = async ({ params }: CaptureFormsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  if (ctx.userRole === 'MEMBER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [forms, members, squads, quota] = await Promise.all([
    getCaptureFormsByOrg(ctx.orgId),
    getOrganizationMembers(ctx.orgId),
    getSquads(ctx),
    checkPlanQuota(ctx.orgId, 'capture_form'),
  ])

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Formulários de Captura</HeaderTitle>
          <HeaderSubTitle>
            Crie formulários embeddable para capturar leads diretamente no seu site.
          </HeaderSubTitle>
          <QuotaHint orgId={ctx.orgId} entity="capture_form" />
        </HeaderLeft>
        <HeaderRight>
          <CreateCaptureFormButton
            withinQuota={quota.withinQuota}
            members={members.accepted}
            squads={squads}
          />
        </HeaderRight>
      </Header>

      <CaptureFormsDataTable forms={forms} members={members.accepted} squads={squads} />
    </div>
  )
}

export default CaptureFormsPage
