import { redirect } from 'next/navigation'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getWebhookSources } from '@/_data-access/webhook-source/get-webhook-sources'
import { getSquads } from '@/_data-access/squad/get-squads'
import { db } from '@/_lib/prisma'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import type { WebhookSourceDto } from '@/_actions/webhook-source/schema'
import { WebhookSourcesDataTable } from './_components/webhook-sources-data-table'
import { CreateWebhookButton } from './_components/create-webhook-button'

interface PageProps {
  params: Promise<{ orgSlug: string }>
}

export default async function WebhooksPage({ params }: PageProps) {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const currentUser = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { isSuperAdmin: true },
  })

  if (!currentUser?.isSuperAdmin) {
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
    <>
      <Header>
        <HeaderLeft>
          <HeaderTitle>Inbound Webhooks</HeaderTitle>
          <HeaderSubTitle>
            Receba dados de Shopify, Hotmart, Google Forms e outros sistemas externos.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <CreateWebhookButton squads={squads} />
        </HeaderRight>
      </Header>
      <WebhookSourcesDataTable data={sources} squads={squads} orgSlug={orgSlug} />
    </>
  )
}
