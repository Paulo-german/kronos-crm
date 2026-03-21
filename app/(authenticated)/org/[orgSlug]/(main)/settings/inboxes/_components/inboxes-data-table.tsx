'use client'

import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import {
  InboxIcon,
  MessageSquare,
  Bot,
  Wifi,
  WifiOff,
  TrashIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { DataTable } from '@/_components/data-table'
import { Sheet } from '@/_components/ui/sheet'
import { useAction } from 'next-safe-action/hooks'
import { updateInbox } from '@/_actions/inbox/update-inbox'
import { deleteInbox } from '@/_actions/inbox/delete-inbox'
import { toast } from 'sonner'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertInboxSheetContent from './upsert-inbox-sheet-content'
import InboxTableDropdownMenu from './table-dropdown-menu'
import type { InboxListDto } from '@/_data-access/inbox/get-inboxes'

interface AgentOption {
  id: string
  name: string
}

interface InboxesDataTableProps {
  inboxes: InboxListDto[]
  agentOptions: AgentOption[]
  orgSlug: string
}

export function InboxesDataTable({
  inboxes,
  agentOptions,
  orgSlug,
}: InboxesDataTableProps) {
  // Estado elevado para sobreviver re-renders da tabela
  const [editingInbox, setEditingInbox] = useState<InboxListDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingInbox, setDeletingInbox] = useState<InboxListDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

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

  const channelLabels: Record<string, string> = {
    WHATSAPP: 'WhatsApp',
    WEB_CHAT: 'Web Chat',
  }

  const columns: ColumnDef<InboxListDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <InboxIcon className="h-4 w-4 text-muted-foreground" />
          <span>Nome</span>
        </div>
      ),
      cell: ({ row }) => {
        const inbox = row.original
        return (
          <a
            href={`/org/${orgSlug}/settings/inboxes/${inbox.id}`}
            className="ml-2 font-medium hover:underline"
          >
            {inbox.name}
          </a>
        )
      },
    },
    {
      accessorKey: 'channel',
      header: () => (
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span>Canal</span>
        </div>
      ),
      cell: ({ row }) => {
        const channel = row.getValue('channel') as string
        return (
          <Badge variant="secondary">
            {channelLabels[channel] ?? channel}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'agentName',
      header: () => (
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-muted-foreground" />
          <span>Agente</span>
        </div>
      ),
      cell: ({ row }) => {
        const agentName = row.getValue('agentName') as string | null
        return agentName || <span className="text-muted-foreground">—</span>
      },
    },
    {
      id: 'status',
      header: () => (
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const hasInstance = !!row.original.evolutionInstanceName
        return hasInstance ? (
          <Badge
            variant="outline"
            className="gap-1.5 bg-kronos-green/10 text-kronos-green border-kronos-green/20"
          >
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1.5">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        )
      },
    },
    {
      accessorKey: 'conversationsCount',
      header: () => (
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span>Conversas</span>
        </div>
      ),
      cell: ({ row }) => {
        return row.original.conversationsCount
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const inbox = row.original
        return (
          <InboxTableDropdownMenu
            inbox={inbox}
            detailHref={`/org/${orgSlug}/settings/inboxes/${inbox.id}`}
            onDelete={() => {
              setDeletingInbox(inbox)
              setIsDeleteOpen(true)
            }}
            onEdit={() => handleEdit(inbox)}
          />
        )
      },
    },
  ]

  return (
    <>
      {/* Sheet de edição fora da tabela */}
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

      {/* Dialog de confirmação de deleção */}
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
            {deletingInbox?.evolutionInstanceName && (
              <>
                {' '}
                A conexão WhatsApp também será desconectada.
              </>
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

      <DataTable columns={columns} data={inboxes} />
    </>
  )
}
