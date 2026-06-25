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
import { getOrgContext } from '@/_data-access/organization/get-organization-context'
import { getBroadcastStats } from '@/_data-access/broadcast/get-broadcast-stats'
import { getBroadcasts } from '@/_data-access/broadcast/get-broadcasts'
import { BroadcastStatusBadge } from '../_components/broadcast-status-badge'

const RECENT_LIMIT = 5

interface ProspectionHomePageProps {
  params: Promise<{ orgSlug: string }>
}

const ProspectionHomePage = async ({ params }: ProspectionHomePageProps) => {
  const { orgSlug } = await params
  const ctx = await getOrgContext(orgSlug)

  const [stats, recent] = await Promise.all([
    getBroadcastStats(ctx),
    getBroadcasts(ctx, { page: 1, pageSize: RECENT_LIMIT, search: '' }),
  ])

  const kpis = [
    {
      label: 'Disparos ativos',
      value: stats.activeCount.toLocaleString('pt-BR'),
      hint: 'Enviando ou agendados',
      icon: <Megaphone className="size-5" />,
    },
    {
      label: 'Mensagens enviadas',
      value: stats.totalSent.toLocaleString('pt-BR'),
      hint: 'Total acumulado',
      icon: <Send className="size-5" />,
    },
    {
      label: 'Taxa de entrega',
      value: `${stats.deliveryRate}%`,
      hint: 'Entregues vs. falhas',
      icon: <CheckCircle2 className="size-5" />,
    },
    {
      label: 'Contatos alcançados',
      value: stats.totalReached.toLocaleString('pt-BR'),
      hint: 'Mensagens entregues',
      icon: <Users className="size-5" />,
    },
  ]

  const broadcastsHref = `/org/${orgSlug}/prospection/broadcasts`

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
            <Link href={broadcastsHref}>
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
            {recent.data.length > 0 && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={broadcastsHref}>
                  Ver todos
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>

          {recent.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Megaphone className="size-8 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum disparo ainda</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Crie seu primeiro disparo para alcançar seus contatos por
                WhatsApp.
              </p>
              <Button asChild className="mt-2">
                <Link href={broadcastsHref}>
                  <Megaphone className="size-4" />
                  Criar disparo
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y">
              {recent.data.map((broadcast) => (
                <Link
                  key={broadcast.id}
                  href={`${broadcastsHref}/${broadcast.id}`}
                  className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {broadcast.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {broadcast.inboxName} ·{' '}
                      {broadcast.totalRecipients.toLocaleString('pt-BR')}{' '}
                      contatos
                    </p>
                  </div>
                  <BroadcastStatusBadge status={broadcast.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ProspectionHomePage
