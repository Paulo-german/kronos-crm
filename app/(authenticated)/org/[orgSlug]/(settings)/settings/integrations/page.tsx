import Link from 'next/link'
import { Webhook } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Separator } from '@/_components/ui/separator'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getUserIntegrations } from '@/_data-access/integration/get-user-integrations'
import Header, {
  HeaderLeft,
  HeaderSubTitle,
  HeaderTitle,
} from '@/_components/header'
import { BackButton } from '@/_components/layout/back-button'
import IntegrationCard from '@/(authenticated)/org/[orgSlug]/(settings)/settings/integrations/_components/integration-card'
import ConnectedToast from '@/(authenticated)/org/[orgSlug]/(settings)/settings/integrations/_components/connected-toast'
import { Suspense } from 'react'

interface IntegrationsPageProps {
  params: Promise<{ orgSlug: string }>
}

const IntegrationsPage = async ({ params }: IntegrationsPageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const canManageWebhooks = ctx.userRole === 'OWNER' || ctx.userRole === 'ADMIN'

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
    <div className="space-y-6 p-6 md:p-8">
      <BackButton href={`/org/${orgSlug}/settings`} />
      {/* Permite uso de useSearchParams em modo Suspense */}
      <Suspense>
        <ConnectedToast />
      </Suspense>

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

        {canManageWebhooks && <Card className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted">
                <Webhook className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Webhooks de Entrada</CardTitle>
                <CardDescription className="text-sm">
                  Receba dados de plataformas externas automaticamente.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1">
            <p className="text-sm text-muted-foreground">
              Crie endpoints para receber eventos do Shopify, Hotmart, Google Forms e outras plataformas.
            </p>
          </CardContent>
          <Separator />
          <CardFooter className="pt-4">
            <Button asChild size="sm" variant="outline">
              <Link href={`/org/${orgSlug}/settings/integrations/webhooks`}>
                Gerenciar webhooks
              </Link>
            </Button>
          </CardFooter>
        </Card>}
      </div>
    </div>
  )
}

export default IntegrationsPage
