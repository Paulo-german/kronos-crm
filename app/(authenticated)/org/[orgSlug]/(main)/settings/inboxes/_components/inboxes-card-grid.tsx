'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  InboxIcon,
  Bot,
  MessageSquareIcon,
  CalendarIcon,
  PlusIcon,
  Wifi,
  WifiOff,
  TrashIcon,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { Sheet } from '@/_components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { updateInbox } from '@/_actions/inbox/update-inbox'
import { deleteInbox } from '@/_actions/inbox/delete-inbox'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertInboxSheetContent from './upsert-inbox-sheet-content'
import InboxTableDropdownMenu from './table-dropdown-menu'
import type { InboxListDto } from '@/_data-access/inbox/get-inboxes'

interface AgentOption {
  id: string
  name: string
}

interface InboxesCardGridProps {
  inboxes: InboxListDto[]
  agentOptions: AgentOption[]
  orgSlug: string
  withinQuota: boolean
}

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB_CHAT: 'Web Chat',
}

const connectionTypeLabels: Record<string, string> = {
  EVOLUTION: 'WhatsApp',
  META_CLOUD: 'API Oficial',
  Z_API: 'Z-API',
}

const resolveProviderLabel = (inbox: InboxListDto): string => {
  if (inbox.connectionType === 'EVOLUTION' && !!inbox.evolutionApiUrl) {
    return 'Evolution API'
  }
  return connectionTypeLabels[inbox.connectionType] ?? inbox.connectionType
}

const isInboxConnected = (inbox: InboxListDto): boolean =>
  (!!inbox.evolutionInstanceName && inbox.evolutionConnected) ||
  (inbox.connectionType === 'META_CLOUD' && !!inbox.metaPhoneNumberId) ||
  (inbox.connectionType === 'Z_API' && !!inbox.zapiInstanceId)

export function InboxesCardGrid({
  inboxes,
  agentOptions,
  orgSlug,
  withinQuota,
}: InboxesCardGridProps) {
  const [editingInbox, setEditingInbox] = useState<InboxListDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingInbox, setDeletingInbox] = useState<InboxListDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const router = useRouter()

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateInbox,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada atualizada com sucesso!')
        setIsEditOpen(false)
        setEditingInbox(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar caixa de entrada.')
      },
    },
  )

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
    deleteInbox,
    {
      onSuccess: () => {
        toast.success('Caixa de entrada excluída com sucesso.')
        setIsDeleteOpen(false)
        setDeletingInbox(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir caixa de entrada.')
      },
    },
  )

  const handleEdit = (inbox: InboxListDto) => {
    setEditingInbox(inbox)
    setIsEditOpen(true)
  }

  const formattedDate = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    }).format(new Date(date))

  // Empty state
  if (inboxes.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <InboxIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              Nenhuma caixa de entrada
            </h3>
            <p className="text-sm text-muted-foreground">
              Crie sua primeira caixa de entrada para conectar um canal de
              atendimento.
            </p>
          </div>
          {withinQuota ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nova Caixa de Entrada
            </Button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Nova Caixa de Entrada
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Limite atingido. Faça upgrade do plano.
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <UpsertInboxSheetContent
            setIsOpen={setIsCreateOpen}
            agentOptions={agentOptions}
          />
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inboxes.map((inbox) => {
          const connected = isInboxConnected(inbox)

          return (
            <div
              key={inbox.id}
              className="group cursor-pointer"
              onClick={() =>
                router.push(`/org/${orgSlug}/settings/inboxes/${inbox.id}`)
              }
            >
              <Card className="flex min-h-[180px] flex-col transition-colors hover:border-primary/50">
                <CardContent className="flex flex-1 flex-col gap-3 p-5">
                  {/* Header: status badge + dropdown */}
                  <div className="flex items-center justify-between">
                    {connected ? (
                      <Badge
                        variant="outline"
                        className="gap-1.5 border-kronos-green/20 bg-kronos-green/10 text-kronos-green"
                      >
                        <Wifi className="h-3 w-3" />
                        Conectado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1.5">
                        <WifiOff className="h-3 w-3" />
                        Desconectado
                      </Badge>
                    )}
                    <div onClick={(event) => event.stopPropagation()}>
                      <InboxTableDropdownMenu
                        inbox={inbox}
                        detailHref={`/org/${orgSlug}/settings/inboxes/${inbox.id}`}
                        onEdit={() => handleEdit(inbox)}
                        onDelete={() => {
                          setDeletingInbox(inbox)
                          setIsDeleteOpen(true)
                        }}
                      />
                    </div>
                  </div>

                  {/* Name + badges */}
                  <div className="space-y-1.5">
                    <h3 className="text-base font-semibold leading-tight">
                      {inbox.name}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {channelLabels[inbox.channel] ?? inbox.channel}
                      </Badge>
                      {connected && (
                        <Badge variant="secondary">
                          {resolveProviderLabel(inbox)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Stats footer */}
                  <div className="mt-auto flex items-center gap-4 border-t pt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Bot className="h-3.5 w-3.5" />
                      <span>{inbox.agentName ?? '—'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquareIcon className="h-3.5 w-3.5" />
                      <span>{inbox.conversationsCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      <span>{formattedDate(inbox.createdAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )
        })}

        {/* Card "+" para criar */}
        {withinQuota ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[180px] cursor-pointer rounded-xl border-2 border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2">
              <div className="rounded-full border-2 border-dashed p-2">
                <PlusIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Nova Caixa de Entrada
              </span>
            </div>
          </button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="min-h-[180px] cursor-not-allowed rounded-xl border-2 border-dashed bg-muted/30 opacity-50">
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <div className="rounded-full border-2 border-dashed p-2">
                    <PlusIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Nova Caixa de Entrada
                  </span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Limite atingido. Faça upgrade do plano.
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Edit sheet */}
      <Sheet
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) setEditingInbox(null)
        }}
      >
        {editingInbox && (
          <UpsertInboxSheetContent
            key={editingInbox.id}
            defaultValues={{
              id: editingInbox.id,
              name: editingInbox.name,
              channel: editingInbox.channel as 'WHATSAPP' | 'WEB_CHAT',
              agentId: editingInbox.agentId,
            }}
            setIsOpen={setIsEditOpen}
            agentOptions={agentOptions}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      {/* Create sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <UpsertInboxSheetContent
          setIsOpen={setIsCreateOpen}
          agentOptions={agentOptions}
        />
      </Sheet>

      {/* Delete dialog */}
      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) setDeletingInbox(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Todas as conversas e mensagens
            desta caixa de entrada serão excluídas permanentemente.
            {(deletingInbox?.evolutionInstanceName ||
              deletingInbox?.metaPhoneNumberId ||
              deletingInbox?.zapiInstanceId) && (
              <> A conexão WhatsApp também será desconectada.</>
            )}
            <br />
            <span className="font-bold text-foreground">
              {deletingInbox?.name}
            </span>
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingInbox) executeDelete({ id: deletingInbox.id })
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />
    </>
  )
}
