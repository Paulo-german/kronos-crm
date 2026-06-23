import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getWebhookSources } from '@/_data-access/webhook-source/get-webhook-sources'
import { getSquads } from '@/_data-access/squad/get-squads'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import type { WebhookSourceDto } from '@/_actions/webhook-source/schema'
import { WebhookSourcesDataTable } from '@/(authenticated)/org/[orgSlug]/(settings)/settings/integrations/webhooks/_components/webhook-sources-data-table'
import { CreateWebhookButton } from '@/(authenticated)/org/[orgSlug]/(settings)/settings/integrations/webhooks/_components/create-webhook-button'

interface PageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function WebhooksPage({ params }: PageProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // RBAC: apenas OWNER/ADMIN podem gerenciar webhooks de entrada
  if (ctx.userRole !== 'OWNER' && ctx.userRole !== 'ADMIN') {
    redirect(`/org/${orgSlug}/settings/integrations`)
  }

  const [rawSources, squads] = await Promise.all([
    getWebhookSources(ctx),
    getSquads(ctx),
  ])

  // fieldMapping vem como JsonValue do Prisma — casteamos para o tipo esperado pelo DTO
  const sources = rawSources.map((source) => ({
    ...source,
    fieldMapping: (source.fieldMapping ?? {}) as Record<string, string>,
  })) satisfies WebhookSourceDto[]

  return (
    <div className="space-y-6 p-6 md:p-8">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Inbound Webhooks</HeaderTitle>
          <HeaderSubTitle>
            Receba dados de Shopify, Hotmart, Google Forms e outros sistemas
            externos.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateWebhookButton squads={squads} />
        </HeaderRight>
      </Header>
      <WebhookSourcesDataTable
        data={sources}
        squads={squads}
        orgSlug={orgSlug}
      />
    </div>
  )
}
