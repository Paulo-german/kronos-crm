import Link from 'next/link'
import { ArrowLeft, Zap, CreditCard, TrendingUp } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/_components/ui/card'
import { Progress } from '@/_components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getCreditBalance } from '@/_data-access/billing/get-credit-balance'
import { getWalletTransactions } from '@/_data-access/billing/get-wallet-transactions'
import { getPlanLimits } from '@/_lib/rbac/plan-limits'
import { cn } from '@/_lib/utils'
import type { WalletTransactionType } from '@prisma/client'

interface CreditsSettingsPageProps {
  params: Promise<{ orgSlug: string }>
}

const PLAN_LABELS: Record<string, string> = {
  light: 'Light',
  essential: 'Essential',
  scale: 'Scale',
  enterprise: 'Enterprise',
}

const TYPE_CONFIG: Record<WalletTransactionType, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  USAGE_DEBIT: { label: 'Uso', variant: 'destructive' },
  SYSTEM_REFUND: { label: 'Reembolso', variant: 'default' },
  REFUND: { label: 'Reembolso', variant: 'default' },
  CREDIT_PURCHASE: { label: 'Compra', variant: 'secondary' },
  MONTHLY_RESET: { label: 'Reset', variant: 'outline' },
  MANUAL_ADJUSTMENT: { label: 'Ajuste', variant: 'outline' },
  AUTO_RECHARGE: { label: 'Recarga', variant: 'secondary' },
  EXPIRATION: { label: 'Expiração', variant: 'outline' },
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export default async function CreditsSettingsPage({ params }: CreditsSettingsPageProps) {
  const { orgSlug } = await params
  const { orgId } = await getOrgContext(orgSlug)

  const [creditBalance, { plan }, transactions] = await Promise.all([
    getCreditBalance(orgId),
    getPlanLimits(orgId),
    getWalletTransactions(orgId),
  ])

  const { available, planBalance, topUpBalance, monthlyLimit } = creditBalance

  const used = monthlyLimit - planBalance
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

      {/* Histórico de transações */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transações</CardTitle>
          <CardDescription>
            Últimas {transactions.length} transações de créditos IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma transação registrada
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Saldo Plano</TableHead>
                  <TableHead className="text-right">Saldo TopUp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  const config = TYPE_CONFIG[transaction.type]
                  return (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm">
                        {transaction.description}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right font-medium tabular-nums',
                          transaction.amount < 0
                            ? 'text-destructive'
                            : 'text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {transaction.balanceAfterPlan}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {transaction.balanceAfterTopUp}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
