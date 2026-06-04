import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAllDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import { BackButton } from '@/_components/layout/back-button'
import CreateLostReasonButton from '@/(authenticated)/org/[orgSlug]/(main)/settings/loss-reasons/_components/create-lost-reason-button'
import { LostReasonsDataTable } from '@/(authenticated)/org/[orgSlug]/(main)/settings/loss-reasons/_components/lost-reasons-data-table'

interface ReasonsPageProps {
  params: Promise<{ orgSlug: string }>
}

const LossReasonsPage = async ({ params }: ReasonsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const reasons = await getAllDealLostReasons(orgId)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <BackButton href={`/org/${orgSlug}/crm/settings`} />
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Motivos de Perda</h1>
            <p className="text-muted-foreground">
              Gerencie os motivos pelos quais uma negociação pode ser perdida.
            </p>
          </div>
          <CreateLostReasonButton />
        </div>
        <LostReasonsDataTable reasons={reasons} />
      </div>
    </div>
  )
}

export default LossReasonsPage
