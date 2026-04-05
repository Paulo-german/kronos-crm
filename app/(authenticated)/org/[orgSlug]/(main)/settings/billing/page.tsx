import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { getAllQuotas } from '@/_data-access/billing/get-all-quotas'
import { getTrialStatus } from '@/_data-access/billing/get-trial-status'
import { getInvoices } from '@/_data-access/billing/get-invoices'
import { QuotaUsageCard } from './_components/quota-usage-card'
import { InvoiceHistory } from './_components/invoice-history'
import { ManageSubscriptionButton } from './_components/manage-subscription-button'

interface BillingSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PLAN_LABELS: Record<string, string> = {
  light: 'Light',
  essential: 'Essential',
  scale: 'Scale',
  enterprise: 'Enterprise',
}

export default async function BillingSettingsPage({
  params,
}: BillingSettingsPageProps) {
  const { orgSlug } = await params
  const { userRole, orgId } = await getOrgContext(orgSlug)

  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect(`/org/${orgSlug}/settings`)
  }

  const [{ plan }, quotas, trialStatus, invoices] = await Promise.all([
    getPlanLimits(orgId),
    getAllQuotas(orgId),
    getTrialStatus(orgId),
    getInvoices(orgId),
  ])

  // Determina o status a exibir no card de plano
  const planStatusLabel = trialStatus.isOnTrial
    ? 'Trial'
    : trialStatus.hasActiveSubscription
      ? 'Ativo'
      : 'Sem plano'

  const planStatusVariant: 'default' | 'secondary' | 'destructive' = trialStatus.isOnTrial
    ? 'secondary'
    : trialStatus.hasActiveSubscription
      ? 'default'
      : 'destructive'

  const planName = plan ? (PLAN_LABELS[plan] ?? plan) : null

  return (
    <div className="container mx-auto space-y-8 py-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/org/${orgSlug}/settings`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <Header>
        <HeaderLeft>
          <HeaderTitle>Assinatura e Faturamento</HeaderTitle>
          <HeaderSubTitle>
            Gerencie seu plano, visualize o uso e acesse o histórico de faturas.
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="space-y-6">
        {/* Card de gerenciamento do plano */}
        <Card>
          <CardHeader>
            <CardTitle>Seu plano</CardTitle>
            <CardDescription>
              Informações sobre a assinatura atual da sua organização.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plano atual e status */}
            <div className="flex items-center gap-3">
              <span className="text-lg font-semibold">
                {planName ?? 'Nenhum plano ativo'}
              </span>
              <Badge variant={planStatusVariant}>{planStatusLabel}</Badge>
            </div>

            {/* Ações disponíveis */}
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" asChild>
                <Link href={`/org/${orgSlug}/plans`}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver todos os planos
                </Link>
              </Button>

              {/* Botão do portal Stripe — apenas para assinantes ativos (não trial) */}
              {trialStatus.hasActiveSubscription && !trialStatus.isOnTrial && (
                <ManageSubscriptionButton />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Uso de recursos do plano */}
        <QuotaUsageCard quotas={quotas} />

        {/* Histórico de faturas */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Histórico de Faturas</h2>
            <p className="text-sm text-muted-foreground">
              Visualize e baixe suas faturas anteriores.
            </p>
          </div>
          <InvoiceHistory invoices={invoices} />
        </div>
      </div>
    </div>
  )
}
