import Link from 'next/link'
import { Megaphone, Send, CheckCircle2, Users, ArrowRight } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderRight,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { BroadcastStatusBadge } from '../_components/broadcast-status-badge'
import { MOCK_BROADCASTS } from '../_mock/broadcasts-mock'

interface ProspectionHomePageProps {
  params: Promise<{ orgSlug: string }>
}

const ProspectionHomePage = async ({ params }: ProspectionHomePageProps) => {
  const { orgSlug } = await params

  // ⚠️ MOCK — métricas derivadas dos dados fictícios.
  const totalSent = MOCK_BROADCASTS.reduce(
    (accumulator, broadcast) => accumulator + broadcast.sentCount,
    0,
  )
  const totalFailed = MOCK_BROADCASTS.reduce(
    (accumulator, broadcast) => accumulator + broadcast.failedCount,
    0,
  )
  const activeCount = MOCK_BROADCASTS.filter(
    (broadcast) =>
      broadcast.status === 'RUNNING' || broadcast.status === 'SCHEDULED',
  ).length
  const deliveryRate =
    totalSent + totalFailed > 0
      ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
      : 0
  const reached = MOCK_BROADCASTS.reduce(
    (accumulator, broadcast) => accumulator + broadcast.totalRecipients,
    0,
  )

  const kpis = [
    {
      label: 'Disparos ativos',
      value: activeCount.toString(),
      hint: 'Enviando ou agendados',
      icon: <Megaphone className="size-5" />,
    },
    {
      label: 'Mensagens enviadas',
      value: totalSent.toLocaleString('pt-BR'),
      hint: 'Total acumulado',
      icon: <Send className="size-5" />,
    },
    {
      label: 'Taxa de entrega',
      value: `${deliveryRate}%`,
      hint: 'Entregues vs. falhas',
      icon: <CheckCircle2 className="size-5" />,
    },
    {
      label: 'Contatos alcançados',
      value: reached.toLocaleString('pt-BR'),
      hint: 'Somados todos os disparos',
      icon: <Users className="size-5" />,
    },
  ]

  const recentBroadcasts = MOCK_BROADCASTS.slice(0, 4)

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Prospecção</HeaderTitle>
          <HeaderSubTitle>
            Visão geral dos seus disparos e do alcance das campanhas.
          </HeaderSubTitle>
        </HeaderLeft>
        <HeaderRight>
          <Button asChild>
            <Link href={`/org/${orgSlug}/prospection/broadcasts`}>
              <Megaphone className="size-4" />
              Ver disparos
            </Link>
          </Button>
        </HeaderRight>
      </Header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.hint}</p>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-kronos-orange/15 text-kronos-orange">
                {kpi.icon}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Disparos recentes</h3>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/org/${orgSlug}/prospection/broadcasts`}>
                Ver todos
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <div className="divide-y">
            {recentBroadcasts.map((broadcast) => (
              <Link
                key={broadcast.id}
                href={`/org/${orgSlug}/prospection/broadcasts/${broadcast.id}`}
                className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {broadcast.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {broadcast.inboxName} ·{' '}
                    {broadcast.totalRecipients.toLocaleString('pt-BR')} contatos
                  </p>
                </div>
                <BroadcastStatusBadge status={broadcast.status} />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProspectionHomePage
