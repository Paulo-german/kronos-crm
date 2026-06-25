import Link from 'next/link'
import { FileText } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getEligibleInboxes } from '@/_data-access/broadcast/get-eligible-inboxes'
import { getWhatsAppTemplates } from '@/_data-access/inbox/get-whatsapp-templates'
import { TemplatesManager } from './_components/templates-manager'

interface ProspectionTemplatesPageProps {
  params: Promise<{ orgSlug: string }>
}

const ProspectionTemplatesPage = async ({
  params,
}: ProspectionTemplatesPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Templates HSM existem apenas para Meta Cloud (WABA)
  const metaInboxes = (await getEligibleInboxes(ctx)).filter(
    (inbox) => inbox.connectionType === 'META_CLOUD',
  )

  // Sem nenhuma caixa Meta Cloud não há o que gerenciar (Evolution/Z-API
  // usam texto livre, não templates aprovados)
  if (metaInboxes.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Header>
          <HeaderLeft>
            <HeaderTitle>Templates</HeaderTitle>
            <HeaderSubTitle>
              Modelos de mensagem (HSM) aprovados pela Meta.
            </HeaderSubTitle>
          </HeaderLeft>
        </Header>

        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-1 text-sm font-medium">
            Conecte um WhatsApp Cloud API
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Templates aprovados são exigidos pela Meta para iniciar conversas
            fora da janela de 24h. Conecte um canal Meta Cloud para visualizar e
            usar seus templates aqui.
          </p>
          <Button className="mt-2" size="sm" asChild>
            <Link href={`/org/${orgSlug}/prospection/channels`}>
              Conectar canal
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  const firstInbox = metaInboxes[0]
  const initialTemplates = await getWhatsAppTemplates(firstInbox.id, ctx.orgId)

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Templates</HeaderTitle>
          <HeaderSubTitle>
            Modelos de mensagem aprovados pela Meta para iniciar conversas via
            WhatsApp Cloud API.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <TemplatesManager
        inboxes={metaInboxes}
        initialInboxId={firstInbox.id}
        initialTemplates={initialTemplates}
      />
    </div>
  )
}

export default ProspectionTemplatesPage
