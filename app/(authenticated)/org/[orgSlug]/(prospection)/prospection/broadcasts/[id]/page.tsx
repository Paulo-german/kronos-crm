import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowLeft,
  Send,
  CheckCircle2,
  XCircle,
  Users,
  MinusCircle,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
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
import { getBroadcastById } from '@/_data-access/broadcast/get-broadcast-by-id'
import { getBroadcastRecipients } from '@/_data-access/broadcast/get-broadcast-recipients'
import {
  BroadcastStatusBadge,
  RecipientStatusBadge,
} from '../../_components/broadcast-status-badge'
import { getConnectionLabel } from '../../_lib/broadcast-labels'

const RECIPIENTS_PAGE_SIZE = 50

interface BroadcastDetailPageProps {
  params: Promise<{ orgSlug: string; id: string }>
}

const BroadcastDetailPage = async ({ params }: BroadcastDetailPageProps) => {
  const { orgSlug, id } = await params
  const ctx = await getOrgContext(orgSlug)

  const broadcast = await getBroadcastById(id, ctx)
  if (!broadcast) {
    notFound()
  }

  const recipients = await getBroadcastRecipients(ctx, id, {
    page: 1,
    pageSize: RECIPIENTS_PAGE_SIZE,
  })

  const pendingCount =
    broadcast.recipientCounts.PENDING + broadcast.recipientCounts.SENDING
  const skippedCount = broadcast.recipientCounts.SKIPPED
  // Progresso = destinatários já resolvidos (enviados/falhos/ignorados) sobre o
  // total. Inclui SKIPPED como resolvido, senão um disparo concluído com contatos
  // ignorados nunca chegaria a 100%.
  const progress =
    broadcast.totalRecipients > 0
      ? Math.round(
          ((broadcast.totalRecipients - pendingCount) /
            broadcast.totalRecipients) *
            100,
        )
      : 0

  const stats = [
    {
      label: 'Total',
      value: broadcast.totalRecipients,
      icon: <Users className="size-4" />,
      className: 'text-foreground',
    },
    {
      label: 'Enviados',
      value: broadcast.sentCount,
      icon: <CheckCircle2 className="size-4" />,
      className: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Na fila',
      value: pendingCount,
      icon: <Send className="size-4" />,
      className: 'text-muted-foreground',
    },
    {
      label: 'Falhas',
      value: broadcast.failedCount,
      icon: <XCircle className="size-4" />,
      className: 'text-destructive',
    },
    {
      label: 'Ignorados',
      value: skippedCount,
      icon: <MinusCircle className="size-4" />,
      className: 'text-amber-600 dark:text-amber-400',
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Voltar + título */}
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 px-2"
          asChild
        >
          <Link href={`/org/${orgSlug}/prospection/broadcasts`}>
            <ArrowLeft className="size-4" />
            Disparos
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{broadcast.name}</h2>
              <BroadcastStatusBadge status={broadcast.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {broadcast.inboxName} ·{' '}
              {getConnectionLabel(broadcast.connectionType)}
              {broadcast.createdByName
                ? ` · por ${broadcast.createdByName}`
                : ''}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.className}`}>
                  {stat.value.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className={stat.className}>{stat.icon}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progresso geral */}
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso do envio</span>
            <span className="text-muted-foreground">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          {broadcast.startedAt && (
            <p className="text-xs text-muted-foreground">
              Iniciado em{' '}
              {format(broadcast.startedAt, "d 'de' MMM 'às' HH:mm", {
                locale: ptBR,
              })}
              {broadcast.completedAt &&
                ` · concluído às ${format(broadcast.completedAt, 'HH:mm', { locale: ptBR })}`}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Mensagem ou template */}
      <Card>
        <CardContent className="space-y-2 p-5">
          {broadcast.templateName ? (
            <>
              <p className="text-sm font-medium">Template</p>
              <p className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                {broadcast.templateName}
                {broadcast.templateLanguage
                  ? ` (${broadcast.templateLanguage})`
                  : ''}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Mensagem</p>
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
                {broadcast.messageContent}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Destinatários */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h3 className="text-sm font-semibold">Destinatários</h3>
            <span className="text-xs text-muted-foreground">
              {recipients.total.toLocaleString('pt-BR')} no total
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tentativas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipients.data.map((recipient) => (
                <TableRow key={recipient.id}>
                  <TableCell className="font-medium">
                    {recipient.contactName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {recipient.phoneSnapshot}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RecipientStatusBadge status={recipient.status} />
                      {recipient.errorMessage && (
                        <span className="text-xs text-muted-foreground">
                          {recipient.errorMessage}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {recipient.attempts}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

export default BroadcastDetailPage
