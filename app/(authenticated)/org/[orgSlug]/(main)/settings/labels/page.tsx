import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getConversationLabels } from '@/_data-access/conversation-label/get-conversation-labels'
import LabelsList from './_components/labels-list'

interface LabelsPageProps {
  params: Promise<{ orgSlug: string }>
}

const LabelsPage = async ({ params }: LabelsPageProps) => {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)
  const labels = await getConversationLabels(orgId)

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
