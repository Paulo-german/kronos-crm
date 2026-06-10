'use client'

import {
  useState,
  useOptimistic,
  useTransition,
  useCallback,
  useMemo,
} from 'react'
import { useAction } from 'next-safe-action/hooks'
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { Webhook, Copy, Plus } from 'lucide-react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { updateWebhookSource } from '@/_actions/webhook-source/update-webhook-source'
import { deleteWebhookSource } from '@/_actions/webhook-source/delete-webhook-source'
import type { WebhookSourceDto } from '@/_actions/webhook-source/schema'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import {
  PLATFORM_LABELS,
  EVENT_TYPE_LABELS,
  type WebhookPlatform,
  type WebhookEventType,
} from '../_lib/platform-templates'
import { TableDropdownMenu } from './table-dropdown-menu'
import { DeleteWebhookDialogContent } from './delete-webhook-dialog-content'
import { UpsertWebhookSheetContent } from './upsert-webhook-sheet-content'
import { WebhookLogsSheet } from './webhook-logs-sheet'

interface WebhookSourcesDataTableProps {
  data: WebhookSourceDto[]
  squads: SquadDto[]
  orgSlug: string
}

function SuccessRateBadge({
  rate,
  totalEvents,
}: {
  rate: number
  totalEvents: number
}) {
  if (totalEvents === 0)
    return <span className="text-sm text-muted-foreground">—</span>

  const percentage = Math.round(rate * 100)

  if (percentage >= 95) {
    return (
      <span className="text-sm font-medium text-green-600 dark:text-green-400">
        {percentage}%
      </span>
    )
  }
  if (percentage >= 80) {
    return (
      <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
        {percentage}%
      </span>
    )
  }
  return (
    <span className="text-sm font-medium text-red-600 dark:text-red-400">
      {percentage}%
    </span>
  )
}

export function WebhookSourcesDataTable({
  data,
  squads,
  orgSlug,
}: WebhookSourcesDataTableProps) {
  const [, startTransition] = useTransition()
  const [editingSource, setEditingSource] = useState<WebhookSourceDto | null>(
    null,
  )
  const [viewingLogsSourceId, setViewingLogsSourceId] = useState<string | null>(
    null,
  )
  const [viewingLogsSourceName, setViewingLogsSourceName] = useState<string>('')
  const [deletingSource, setDeletingSource] = useState<WebhookSourceDto | null>(
    null,
  )
  const [createOpen, setCreateOpen] = useState(false)

  // Estado otimístico para o toggle de isActive
  const [optimisticSources, updateOptimistic] = useOptimistic(
    data,
    (current, update: { id: string; isActive: boolean }) =>
      current.map((source) =>
        source.id === update.id
          ? { ...source, isActive: update.isActive }
          : source,
      ),
  )

  const { execute: executeUpdate } = useAction(updateWebhookSource, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao atualizar webhook.')
    },
  })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteWebhookSource,
    {
      onSuccess: () => {
        toast.success('Webhook deletado com sucesso.')
        setDeletingSource(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao deletar webhook.')
      },
    },
  )

  const handleToggleActive = useCallback(
    (source: WebhookSourceDto, newValue: boolean) => {
      startTransition(() => {
        updateOptimistic({ id: source.id, isActive: newValue })
        executeUpdate({ id: source.id, isActive: newValue })
      })
    },
    [startTransition, updateOptimistic, executeUpdate],
  )

  const handleViewLogs = useCallback((sourceId: string, sourceName: string) => {
    setViewingLogsSourceId(sourceId)
    setViewingLogsSourceName(sourceName)
  }, [])

  const handleCopyUrl = useCallback((source: WebhookSourceDto) => {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : (process.env.NEXT_PUBLIC_APP_URL ?? '')
    const url = `${origin}/api/webhooks/incoming/${source.token}`
    navigator.clipboard.writeText(url)
    toast.success('URL copiada para a área de transferência.')
  }, [])

  const columns: ColumnDef<WebhookSourceDto>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: 'Nome',
        cell: ({ row }) => (
          <button
            onClick={() => setEditingSource(row.original)}
            className="text-left font-medium text-foreground underline-offset-4 hover:underline"
          >
            {row.original.name}
          </button>
        ),
      },
      {
        accessorKey: 'platform',
        header: 'Plataforma',
        cell: ({ row }) => (
          <Badge variant="secondary">
            {PLATFORM_LABELS[row.original.platform as WebhookPlatform] ??
              row.original.platform}
          </Badge>
        ),
      },
      {
        accessorKey: 'eventType',
        header: 'Evento',
        cell: ({ row }) => (
          <Badge variant="outline">
            {EVENT_TYPE_LABELS[row.original.eventType as WebhookEventType] ??
              row.original.eventType}
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        cell: ({ row }) => {
          const optimistic = optimisticSources.find(
            (source) => source.id === row.original.id,
          )
          const isActive = optimistic?.isActive ?? row.original.isActive

          return (
            <Switch
              checked={isActive}
              onCheckedChange={(newValue) =>
                handleToggleActive(row.original, newValue)
              }
              aria-label={isActive ? 'Desativar webhook' : 'Ativar webhook'}
            />
          )
        },
      },
      {
        accessorKey: 'stats.totalEvents',
        header: 'Total eventos',
        cell: ({ row }) => (
          <span className="text-sm tabular-nums">
            {row.original.stats.totalEvents.toLocaleString('pt-BR')}
          </span>
        ),
      },
      {
        accessorKey: 'stats.successRate',
        header: 'Taxa de sucesso',
        cell: ({ row }) => (
          <SuccessRateBadge
            rate={row.original.stats.successRate}
            totalEvents={row.original.stats.totalEvents}
          />
        ),
      },
      {
        accessorKey: 'lastReceivedAt',
        header: 'Última atividade',
        cell: ({ row }) => {
          const date = row.original.lastReceivedAt

          if (!date) return <span className="text-muted-foreground">—</span>

          return (
            <span className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(date), {
                addSuffix: true,
                locale: ptBR,
              })}
            </span>
          )
        },
      },
      {
        id: 'url',
        header: 'URL',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handleCopyUrl(row.original)}
          >
            <Copy className="h-3.5 w-3.5" />
            Copiar
          </Button>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <TableDropdownMenu
            source={row.original}
            onEdit={setEditingSource}
            onViewLogs={handleViewLogs}
            onDelete={setDeletingSource}
          />
        ),
      },
    ],
    [
      optimisticSources,
      handleToggleActive,
      handleViewLogs,
      handleCopyUrl,
      setEditingSource,
      setDeletingSource,
    ],
  )

  const table = useReactTable({
    data: optimisticSources,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return (
      <>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/60 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50">
            <Webhook className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold">Nenhum webhook configurado</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Crie um endpoint para receber dados de Shopify, Hotmart, Google
              Forms e outros sistemas.
            </p>
          </div>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Criar primeiro webhook
              </Button>
            </SheetTrigger>
            <UpsertWebhookSheetContent
              key={createOpen ? 'open' : 'closed'}
              squads={squads}
              onSuccess={() => setCreateOpen(false)}
            />
          </Sheet>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mt-6 rounded-md border border-border/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Sheet de edição */}
      {editingSource && (
        <Sheet
          open={editingSource !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingSource(null)
          }}
        >
          <UpsertWebhookSheetContent
            key={editingSource.id}
            source={editingSource}
            squads={squads}
            onSuccess={() => setEditingSource(null)}
          />
        </Sheet>
      )}

      {/* Sheet de logs */}
      {viewingLogsSourceId && (
        <WebhookLogsSheet
          webhookSourceId={viewingLogsSourceId}
          sourceName={viewingLogsSourceName}
          orgSlug={orgSlug}
          open={viewingLogsSourceId !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setViewingLogsSourceId(null)
              setViewingLogsSourceName('')
            }
          }}
        />
      )}

      {/* Dialog de delete */}
      {deletingSource && (
        <DeleteWebhookDialogContent
          source={deletingSource}
          onConfirm={() => executeDelete({ id: deletingSource.id })}
          isPending={isDeleting}
          open={deletingSource !== null}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDeletingSource(null)
          }}
        />
      )}
    </>
  )
}
