'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { subDays } from 'date-fns/subDays'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Skeleton } from '@/_components/ui/skeleton'
import { getWebhookLogs } from '@/_actions/webhook-source/get-webhook-logs'
import type { WebhookLogDto } from '@/_actions/webhook-source/schema'
import { WebhookLogsFilters } from './webhook-logs-filters'
import { WebhookLogDetailDialog } from './webhook-log-detail-dialog'

type PeriodFilter = '1d' | '7d' | '30d' | 'all'

const STATUS_BADGE_MAP: Record<string, { variant: 'default' | 'destructive' | 'secondary'; label: string }> = {
  PROCESSED: { variant: 'default', label: 'Processado' },
  ERROR: { variant: 'destructive', label: 'Erro' },
  IGNORED: { variant: 'secondary', label: 'Ignorado' },
}

function periodToDate(period: PeriodFilter): Date | undefined {
  if (period === 'all') return undefined
  const days = period === '1d' ? 1 : period === '7d' ? 7 : 30
  return subDays(new Date(), days)
}

interface WebhookLogsSheetProps {
  webhookSourceId: string
  sourceName: string
  orgSlug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WebhookLogsSheet({
  webhookSourceId,
  sourceName,
  orgSlug,
  open,
  onOpenChange,
}: WebhookLogsSheetProps) {
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7d')
  const [detailLog, setDetailLog] = useState<WebhookLogDto | null>(null)

  const { execute: executeGetLogs, result, isPending } = useAction(getWebhookLogs)

  const loadLogs = useCallback(() => {
    if (!open) return
    const since = periodToDate(periodFilter)
    executeGetLogs({
      webhookSourceId,
      page,
      pageSize: 20,
      status: statusFilter.length > 0
        ? (statusFilter as ('PROCESSED' | 'ERROR' | 'IGNORED')[])
        : undefined,
      since,
    })
  }, [open, webhookSourceId, page, statusFilter, periodFilter, executeGetLogs])

  // Sincroniza com o servidor sempre que filtros, paginação ou visibilidade mudam
  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const logs = result?.data?.logs ?? []
  const totalPages = result?.data?.totalPages ?? 1
  const total = result?.data?.total ?? 0


  const handleStatusChange = (newStatus: string[]) => {
    setPage(1)
    setStatusFilter(newStatus)
  }

  const handlePeriodChange = (newPeriod: string) => {
    setPage(1)
    setPeriodFilter(newPeriod as PeriodFilter)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex flex-col overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Logs — {sourceName}</SheetTitle>
            <SheetDescription>
              {total > 0
                ? `${total} evento${total !== 1 ? 's' : ''} registrado${total !== 1 ? 's' : ''}`
                : 'Nenhum evento registrado'}
            </SheetDescription>
          </SheetHeader>

          <WebhookLogsFilters
            statusFilter={statusFilter}
            onStatusChange={handleStatusChange}
            periodFilter={periodFilter}
            onPeriodChange={handlePeriodChange}
          />

          <div className="flex-1 space-y-1">
            {isPending ? (
              Array.from({ length: 5 }).map((_item, skeletonIndex) => (
                <Skeleton key={skeletonIndex} className="h-12 w-full rounded-md" />
              ))
            ) : logs.length === 0 ? (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Nenhum log encontrado para os filtros selecionados.
                </p>
              </div>
            ) : (
              logs.map((log) => {
                const statusConfig = STATUS_BADGE_MAP[log.status] ?? STATUS_BADGE_MAP.IGNORED
                const formattedDate = formatDistanceToNow(new Date(log.receivedAt), {
                  addSuffix: true,
                  locale: ptBR,
                })

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={statusConfig.variant} className="shrink-0">
                        {statusConfig.label}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                        {log.externalEventId && (
                          <p className="truncate font-mono text-xs text-muted-foreground/70">
                            {log.externalEventId}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 shrink-0"
                      onClick={() => setDetailLog(log)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Ver detalhes
                    </Button>
                  </div>
                )
              })
            )}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground">
                Página {page} de {totalPages}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isPending}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isPending}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de detalhe do log */}
      {detailLog && (
        <WebhookLogDetailDialog
          log={detailLog}
          orgSlug={orgSlug}
          open={detailLog !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDetailLog(null)
          }}
          onReplaySuccess={() => {
            setDetailLog(null)
            loadLogs()
          }}
        />
      )}
    </>
  )
}
