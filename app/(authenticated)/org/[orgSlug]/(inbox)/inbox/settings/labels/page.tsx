import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getConversationLabels } from '@/_data-access/conversation-label/get-conversation-labels'
import { BackButton } from '@/_components/layout/back-button'
import LabelsList from '@/(authenticated)/org/[orgSlug]/(inbox)/inbox/settings/labels/_components/labels-list'

interface LabelsPageProps {
  params: Promise<{ orgSlug: string }>
}

const LabelsPage = async ({ params }: LabelsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const labels = await getConversationLabels(orgId)

  return (
    <div className="container mx-auto space-y-6 py-6">
      <BackButton href={`/org/${orgSlug}/inbox/settings`} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Etiquetas de Conversa
          </h1>
          <p className="text-muted-foreground">
            Crie e gerencie etiquetas para organizar suas conversas.
          </p>
        </div>

        <LabelsList labels={labels} />
      </div>
    </div>
  )
}

export default LabelsPage
