'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  MoreHorizontal,
  Eye,
  Ban,
  Megaphone,
  CalendarClock,
  Inbox,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { Progress } from '@/_components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/_components/ui/alert-dialog'
import type { BroadcastStatus } from '@prisma/client'
import { cancelBroadcast } from '@/_actions/broadcast/cancel-broadcast'
import type { BroadcastDto } from '@/_data-access/broadcast/get-broadcasts'
import { BroadcastStatusBadge } from '../../_components/broadcast-status-badge'
import { getConnectionLabel } from '../../_lib/broadcast-labels'

interface BroadcastsListClientProps {
  broadcasts: BroadcastDto[]
  orgSlug: string
}

const CANCELLABLE: BroadcastStatus[] = ['DRAFT', 'SCHEDULED', 'RUNNING']
const isCancellable = (status: BroadcastStatus) => CANCELLABLE.includes(status)

export const BroadcastsListClient = ({
  broadcasts,
  orgSlug,
}: BroadcastsListClientProps) => {
  const router = useRouter()
  const [cancelTarget, setCancelTarget] = useState<BroadcastDto | null>(null)

  const { execute, isPending } = useAction(cancelBroadcast, {
    onSuccess: () => {
      toast.success('Disparo cancelado.')
      setCancelTarget(null)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Não foi possível cancelar o disparo.')
    },
  })

  if (broadcasts.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
        <Megaphone className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhum disparo ainda</p>
        <p className="text-sm text-muted-foreground">
          Crie seu primeiro disparo para alcançar seus contatos.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {broadcasts.map((broadcast) => {
          // Resolvidos = enviados + falhas + ignorados (chega a 100% quando não
          // há mais nada na fila, mesmo com contatos ignorados)
          const resolved =
            broadcast.sentCount + broadcast.failedCount + broadcast.skippedCount
          const progress =
            broadcast.totalRecipients > 0
              ? Math.round((resolved / broadcast.totalRecipients) * 100)
              : 0
          const detailHref = `/org/${orgSlug}/prospection/broadcasts/${broadcast.id}`
          const dateLabel = broadcast.scheduledFor
            ? `Agendado p/ ${format(broadcast.scheduledFor, "d 'de' MMM, HH:mm", { locale: ptBR })}`
            : `Criado em ${format(broadcast.createdAt, "d 'de' MMM, yyyy", { locale: ptBR })}`

          return (
            <div
              key={broadcast.id}
              onClick={() => router.push(detailHref)}
              className="flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:bg-primary/5 hover:shadow-sm"
            >
              {/* Nome + canal */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">
                    {broadcast.name}
                  </span>
                  <BroadcastStatusBadge status={broadcast.status} />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Inbox className="size-3 shrink-0" />
                    {broadcast.inboxName}
                  </span>
                  <span className="hidden sm:inline">
                    {getConnectionLabel(broadcast.connectionType)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarClock className="size-3 shrink-0" />
                    {dateLabel}
                  </span>
                </div>
              </div>

              {/* Progresso */}
              <div className="hidden w-48 shrink-0 flex-col gap-1 md:flex">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    {broadcast.sentCount.toLocaleString('pt-BR')}/
                    {broadcast.totalRecipients.toLocaleString('pt-BR')}
                  </span>
                  {broadcast.failedCount > 0 && (
                    <span className="text-destructive">
                      {broadcast.failedCount} falhas
                    </span>
                  )}
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Ações */}
              <div onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                      <span className="sr-only">Ações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(detailHref)}>
                      <Eye className="size-4" />
                      Ver detalhes
                    </DropdownMenuItem>
                    {isCancellable(broadcast.status) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setCancelTarget(broadcast)}
                        >
                          <Ban className="size-4" />
                          Cancelar disparo
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )
        })}
      </div>

      <AlertDialog
        open={cancelTarget !== null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este disparo?</AlertDialogTitle>
            <AlertDialogDescription>
              As mensagens ainda não enviadas serão ignoradas. As já enviadas
              permanecem. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault()
                if (cancelTarget) execute({ broadcastId: cancelTarget.id })
              }}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Cancelar disparo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
