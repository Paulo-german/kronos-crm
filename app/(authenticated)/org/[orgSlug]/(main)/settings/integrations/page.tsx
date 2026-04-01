import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserIntegrations } from '@/_data-access/integration/get-user-integrations'
import Header, {
  HeaderLeft,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'
import IntegrationCard from './_components/integration-card'
import ConnectedToast from './_components/connected-toast'
import { Suspense } from 'react'

interface IntegrationsPageProps {
  params: Promise<{ orgSlug: string }>
}

const IntegrationsPage = async ({ params }: IntegrationsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  // Verifica se o Google Calendar está configurado e se a org tem acesso (beta gate)
  const googleBetaOrgIds = (process.env.NEXT_PUBLIC_GOOGLE_BETA_ORG_IDS ?? '').split(',').filter(Boolean)
  const googleCalendarEnabled =
    !!process.env.GOOGLE_CLIENT_ID &&
    (googleBetaOrgIds.length === 0 || googleBetaOrgIds.includes(ctx.orgId))

  const integrations = googleCalendarEnabled
    ? await getUserIntegrations(ctx)
    : []

  // Encontra a integração ativa do Google Calendar (ignora REVOKED)
  const googleCalendarIntegration =
    integrations.find(
      (integration) =>
        integration.provider === 'GOOGLE_CALENDAR' &&
        integration.status !== 'REVOKED',
    ) ?? null

  return (
    <div className="container mx-auto space-y-6 py-6">
      {/* Permite uso de useSearchParams em modo Suspense */}
      <Suspense>
        <ConnectedToast />
      </Suspense>

      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/org/${orgSlug}/settings`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Integrações</HeaderTitle>
          <HeaderSubTitle>
            Conecte ferramentas externas à sua conta.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <IntegrationCard
          integration={googleCalendarIntegration}
          orgSlug={orgSlug}
          enabled={googleCalendarEnabled}
        />
      </div>
    </div>
  )
}

export default IntegrationsPage
