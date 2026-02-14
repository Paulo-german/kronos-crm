import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getAllDealLostReasons } from '@/_data-access/settings/get-lost-reasons'
import CreateLostReasonButton from './_components/create-lost-reason-button'
import { LostReasonsDataTable } from './_components/lost-reasons-data-table'

interface ReasonsPageProps {
  params: Promise<{ orgSlug: string }>
}

const LossReasonsPage = async ({ params }: ReasonsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const reasons = await getAllDealLostReasons(orgId)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
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
