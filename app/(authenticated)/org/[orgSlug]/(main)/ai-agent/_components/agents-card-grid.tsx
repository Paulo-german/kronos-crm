'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BotIcon,
  FileTextIcon,
  ListOrderedIcon,
  MessageSquareIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { Sheet } from '@/_components/ui/sheet'
import { Switch } from '@/_components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { updateAgent } from '@/_actions/agent/update-agent'
import { deleteAgent } from '@/_actions/agent/delete-agent'
import { MODEL_OPTIONS } from '../[agentId]/_components/constants'
import AgentTableDropdownMenu from './table-dropdown-menu'
import UpsertAgentSheetContent from './upsert-agent-sheet-content'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import type { MemberRole } from '@prisma/client'

const MODEL_LABEL_MAP = new Map<string, string>(
  MODEL_OPTIONS.map((model) => [model.value, model.label]),
)

function getModelLabel(modelId: string): string {
  return MODEL_LABEL_MAP.get(modelId) ?? modelId.split('/').pop() ?? modelId
}

interface AgentsCardGridProps {
  agents: AgentDto[]
  orgSlug: string
  userRole: MemberRole
  withinQuota: boolean
}

export function AgentsCardGrid({
  agents,
  orgSlug,
  userRole,
  withinQuota,
}: AgentsCardGridProps) {
  const [editingAgent, setEditingAgent] = useState<AgentDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<AgentDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null)

  const canManage = userRole === 'OWNER' || userRole === 'ADMIN'

  const { execute: executeToggle } = useAction(updateAgent, {
    onSuccess: () => {
      toast.success('Status do agente atualizado!')
      setTogglingAgentId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar status.')
      setTogglingAgentId(null)
    },
  })

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

  if (agents.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <BotIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Nenhum agente criado</h3>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro agente de IA para automatizar atendimentos.
            </p>
          </div>
          {withinQuota ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Novo Agente
            </Button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Novo Agente
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
          <UpsertAgentSheetContent setIsOpen={setIsCreateOpen} />
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/org/${orgSlug}/ai-agent/${agent.id}`}
            className="group"
          >
            <Card className="flex min-h-[180px] flex-col transition-colors hover:border-primary/50">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                {/* Header: status toggle + dropdown */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                    }}
                  >
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={() => {
                        setTogglingAgentId(agent.id)
                        executeToggle({
                          id: agent.id,
                          isActive: !agent.isActive,
                        })
                      }}
                      disabled={
                        togglingAgentId === agent.id || !canManage
                      }
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">
                      {agent.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {canManage && (
                    <div
                      onClick={(event) => event.preventDefault()}
                      onClickCapture={(event) => event.stopPropagation()}
                    >
                      <AgentTableDropdownMenu
                        agentDetailHref={`/org/${orgSlug}/ai-agent/${agent.id}`}
                        onEdit={() => handleEdit(agent)}
                        onDelete={() => {
                          setDeletingAgent(agent)
                          setIsDeleteOpen(true)
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Name + model */}
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold leading-tight">
                    {agent.name}
                  </h3>
                  <Badge variant="secondary">{getModelLabel(agent.modelId)}</Badge>
                </div>

                {/* Stats footer */}
                <div className="mt-auto flex items-center gap-4 border-t pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ListOrderedIcon className="h-3.5 w-3.5" />
                    <span>{agent.stepsCount} etapas</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageSquareIcon className="h-3.5 w-3.5" />
                    <span>{agent.inboxCount} inbox</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileTextIcon className="h-3.5 w-3.5" />
                    <span>{agent.knowledgeFilesCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {/* Create card */}
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
                Novo Agente
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
                    Novo Agente
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

      {/* Create sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <UpsertAgentSheetContent setIsOpen={setIsCreateOpen} />
      </Sheet>

      {/* Delete confirmation */}
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
            </span>{' '}
            e todos os seus dados (etapas, arquivos, conversas).
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
    </>
  )
}
