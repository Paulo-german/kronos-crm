'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ColumnDef } from '@tanstack/react-table'
import {
  BotIcon,
  CpuIcon,
  CircleCheckIcon,
  ListOrderedIcon,
  MessageSquareIcon,
  TrashIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { DataTable } from '@/_components/data-table'
import { Sheet } from '@/_components/ui/sheet'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { updateAgent } from '@/_actions/agent/update-agent'
import { deleteAgent } from '@/_actions/agent/delete-agent'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import UpsertAgentSheetContent from './upsert-agent-sheet-content'
import AgentTableDropdownMenu from './table-dropdown-menu'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import type { MemberRole } from '@prisma/client'

interface AgentsDataTableProps {
  agents: AgentDto[]
  orgSlug: string
  userRole: MemberRole
}

export function AgentsDataTable({
  agents,
  orgSlug,
  userRole,
}: AgentsDataTableProps) {
  const [editingAgent, setEditingAgent] = useState<AgentDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<AgentDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateAgent,
    {
      onSuccess: () => {
        toast.success('Agente atualizado com sucesso!')
        setIsEditOpen(false)
        setEditingAgent(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar agente.')
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteAgent,
    {
      onSuccess: () => {
        toast.success('Agente excluído com sucesso.')
        setIsDeleteOpen(false)
        setDeletingAgent(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir agente.')
      },
    },
  )

  const handleEdit = (agent: AgentDto) => {
    setEditingAgent(agent)
    setIsEditOpen(true)
  }

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  const columns: ColumnDef<AgentDto>[] = [
    {
      accessorKey: 'name',
      header: () => (
        <div className="flex items-center gap-2">
          <BotIcon className="h-4 w-4 text-muted-foreground" />
          <span>Nome</span>
        </div>
      ),
      cell: ({ row }) => {
        const agent = row.original
        return (
          <Link
            href={`/org/${orgSlug}/ai-agent/${agent.id}`}
            className="ml-2 font-medium hover:underline"
          >
            {agent.name}
          </Link>
        )
      },
    },
    {
      accessorKey: 'modelId',
      header: () => (
        <div className="flex items-center gap-2">
          <CpuIcon className="h-4 w-4 text-muted-foreground" />
          <span>Modelo</span>
        </div>
      ),
      cell: ({ row }) => {
        const modelId = row.getValue('modelId') as string
        const shortName = modelId.split('/').pop() || modelId
        return <Badge variant="secondary">{shortName}</Badge>
      },
    },
    {
      accessorKey: 'isActive',
      header: () => (
        <div className="flex items-center gap-2">
          <CircleCheckIcon className="h-4 w-4 text-muted-foreground" />
          <span>Status</span>
        </div>
      ),
      cell: ({ row }) => {
        const isActive = row.getValue('isActive') as boolean
        return isActive ? (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Ativo
          </Badge>
        ) : (
          <Badge variant="secondary">Inativo</Badge>
        )
      },
    },
    {
      accessorKey: 'stepsCount',
      header: () => (
        <div className="flex items-center gap-2">
          <ListOrderedIcon className="h-4 w-4 text-muted-foreground" />
          <span>Etapas</span>
        </div>
      ),
      cell: ({ row }) => {
        const count = row.getValue('stepsCount') as number
        return <span className="text-muted-foreground">{count}</span>
      },
    },
    {
      accessorKey: 'evolutionInstanceName',
      header: () => (
        <div className="flex items-center gap-2">
          <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
          <span>WhatsApp</span>
        </div>
      ),
      cell: ({ row }) => {
        const instanceName = row.getValue('evolutionInstanceName') as
          | string
          | null
        return instanceName ? (
          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
            Conectado
          </Badge>
        ) : (
          <Badge variant="outline">Desconectado</Badge>
        )
      },
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            cell: ({ row }: { row: { original: AgentDto } }) => {
              const agent = row.original
              return (
                <AgentTableDropdownMenu
                  agentDetailHref={`/org/${orgSlug}/ai-agent/${agent.id}`}
                  onEdit={() => handleEdit(agent)}
                  onDelete={() => {
                    setDeletingAgent(agent)
                    setIsDeleteOpen(true)
                  }}
                />
              )
            },
          } satisfies ColumnDef<AgentDto>,
        ]
      : []),
  ]

  return (
    <>
      <Sheet
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open)
          if (!open) setEditingAgent(null)
        }}
      >
        {editingAgent && (
          <UpsertAgentSheetContent
            key={editingAgent.id}
            defaultValues={{
              id: editingAgent.id,
              name: editingAgent.name,
              isActive: editingAgent.isActive,
            }}
            setIsOpen={setIsEditOpen}
            onUpdate={(data) => executeUpdate(data)}
            isUpdating={isUpdating}
          />
        )}
      </Sheet>

      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) setDeletingAgent(null)
        }}
        title="Você tem certeza absoluta?"
        description={
          <p>
            Esta ação não pode ser desfeita. Você está prestes a remover
            permanentemente o agente{' '}
            <span className="font-bold text-foreground">
              {deletingAgent?.name}
            </span>
            {' '}e todos os seus dados (etapas, arquivos, conversas).
          </p>
        }
        icon={<TrashIcon />}
        variant="destructive"
        onConfirm={() => {
          if (deletingAgent) executeDelete({ id: deletingAgent.id })
        }}
        isLoading={isDeleting}
        confirmLabel="Confirmar Exclusão"
      />

      <DataTable columns={columns} data={agents} />
    </>
  )
}
