import Link from 'next/link'
import { ArrowLeft, Zap, CreditCard, TrendingUp } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/_components/ui/card'
import { Progress } from '@/_components/ui/progress'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { cn } from '@/_lib/utils'

interface CreditsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PLAN_LABELS: Record<string, string> = {
  light: 'Light',
  essential: 'Essential',
  scale: 'Scale',
  enterprise: 'Enterprise',
}

export default async function CreditsSettingsPage({ params }: CreditsSettingsPageProps) {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const [creditBalance, { plan }] = await Promise.all([
    getCreditBalance(orgId),
    getPlanLimits(orgId),
  ])

  const { available, planBalance, topUpBalance, monthlyLimit } = creditBalance

  const used = Math.max(monthlyLimit - available, 0)
  const usedPercent = monthlyLimit > 0 ? Math.min(Math.round((used / monthlyLimit) * 100), 100) : 0
  const availablePercent = 100 - usedPercent

  const progressColor =
    usedPercent > 90
      ? '[&>div]:bg-destructive'
      : '[&>div]:bg-primary'

  const planLabel = plan ? PLAN_LABELS[plan] ?? plan : 'Sem plano'

  return (
    <div className="container mx-auto space-y-8 py-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/org/${orgSlug}/settings`}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Créditos IA</h1>
        <p className="text-muted-foreground">
          Gerencie seus créditos de inteligência artificial
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Saldo disponível */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponível</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{available}</div>
            <p className="text-xs text-muted-foreground">
              de {monthlyLimit} créditos mensais
            </p>
            <Progress
              value={availablePercent}
              className={cn('mt-3 h-2', progressColor)}
            />
          </CardContent>
        </Card>

        {/* Saldo do plano */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo do Plano</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{planBalance}</div>
            <p className="text-xs text-muted-foreground">
              Créditos incluídos no plano {planLabel}
            </p>
          </CardContent>
        </Card>

        {/* Saldo extra (top-up) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos Extras</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{topUpBalance}</div>
            <p className="text-xs text-muted-foreground">
              Créditos adquiridos separadamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Info do plano */}
      <Card>
        <CardHeader>
          <CardTitle>Limite do Plano</CardTitle>
          <CardDescription>
            Seu plano <span className="font-medium text-foreground">{planLabel}</span> inclui{' '}
            <span className="font-medium text-foreground">{monthlyLimit}</span> créditos IA por mês.
            Os créditos são renovados automaticamente a cada ciclo de faturamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Uso no período atual</p>
              <p className="text-xs text-muted-foreground">
                {used} de {monthlyLimit} créditos utilizados ({usedPercent}%)
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${orgSlug}/settings/billing`}>
                Gerenciar plano
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
