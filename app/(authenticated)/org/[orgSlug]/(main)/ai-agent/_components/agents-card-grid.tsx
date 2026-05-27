'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangleIcon,
  BotIcon,
  ChevronsUpIcon,
  FileTextIcon,
  ListOrderedIcon,
  Loader2,
  MessageSquareIcon,
  PlusIcon,
  Wrench,
} from 'lucide-react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import { updateAgent } from '@/_actions/agent/update-agent'
import { migrateStepToolsToGlobal } from '@/_actions/agent/migrate-step-tools-to-global'
import { AGENT_TIERS } from '@/_lib/ai/models'
import AgentTableDropdownMenu from './table-dropdown-menu'
import UpsertAgentSheetContent from './upsert-agent-sheet-content'
import DeleteAgentDialog from './delete-agent-dialog'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import type { MemberRole } from '@prisma/client'

interface AgentsCardGridProps {
  agents: AgentDto[]
  orgSlug: string
  userRole: MemberRole
  withinQuota: boolean
  allAgents: AgentDto[]
  singleV2OverhaulEnabled: boolean
  isSuperAdmin: boolean
}

export function AgentsCardGrid({
  agents,
  orgSlug,
  userRole,
  withinQuota,
  allAgents,
  singleV2OverhaulEnabled,
  isSuperAdmin,
}: AgentsCardGridProps) {
  const [editingAgent, setEditingAgent] = useState<AgentDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingAgent, setDeletingAgent] = useState<AgentDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [migratingAgent, setMigratingAgent] = useState<AgentDto | null>(null)
  const [isMigrateOpen, setIsMigrateOpen] = useState(false)

  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null)
  const router = useRouter()

  const canManage =
    userRole === 'OWNER' || userRole === 'ADMIN' || userRole === 'SUPPORT'

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

  const { execute: executeMigrateTools, isPending: isMigratingTools } =
    useAction(migrateStepToolsToGlobal, {
      onSuccess: () => {
        toast.success('Agente migrado para v2 com sucesso!')
        setIsMigrateOpen(false)
        setMigratingAgent(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao migrar tools do agente.')
        setIsMigrateOpen(false)
        setMigratingAgent(null)
      },
    })

  const { execute: executeMigrate, isPending: isMigratingVersion } = useAction(
    updateAgent,
    {
      onSuccess: ({ input }) => {
        executeMigrateTools({ agentId: input.id })
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao migrar agente.')
      },
    },
  )

  const isMigrating = isMigratingVersion || isMigratingTools

  const handleMigrate = () => {
    if (!migratingAgent) return
    executeMigrate({ id: migratingAgent.id, agentVersion: 'single-v2' })
  }

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
          <UpsertAgentSheetContent
            setIsOpen={setIsCreateOpen}
            singleV2OverhaulEnabled={singleV2OverhaulEnabled}
            isSuperAdmin={isSuperAdmin}
          />
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="group cursor-pointer"
            onClick={() => router.push(`/org/${orgSlug}/ai-agent/${agent.id}`)}
          >
            <Card className="flex min-h-[180px] flex-col border border-transparent transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary">
              <CardContent className="flex flex-1 flex-col gap-3 p-5">
                {/* Header: status toggle + dropdown */}
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-2"
                    onClick={(event) => event.stopPropagation()}
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
                      disabled={togglingAgentId === agent.id || !canManage}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">
                      {agent.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {canManage && (
                    <div onClick={(event) => event.stopPropagation()}>
                      <AgentTableDropdownMenu
                        agentDetailHref={`/org/${orgSlug}/ai-agent/${agent.id}`}
                        executionsHref={`/org/${orgSlug}/ai-agent/${agent.id}/executions`}
                        canViewExecutions={userRole === 'SUPPORT'}
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
                  <Badge variant="secondary">
                    {AGENT_TIERS.find((tier) => tier.modelId === agent.modelId)
                      ?.label ?? 'Médio'}
                  </Badge>
                </div>

                {/* Migration banner — single-v1 only, superadmin only */}
                {agent.agentVersion === 'single-v1' && isSuperAdmin && (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setMigratingAgent(agent)
                      setIsMigrateOpen(true)
                    }}
                    className="flex w-full items-center justify-between rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
                  >
                    <span className="text-xs text-muted-foreground">
                      Versão Padrão
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-primary">
                      <ChevronsUpIcon className="h-3 w-3" />
                      Migrar para v2
                    </span>
                  </button>
                )}

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
          </div>
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
            singleV2OverhaulEnabled={singleV2OverhaulEnabled}
            isSuperAdmin={isSuperAdmin}
          />
        )}
      </Sheet>

      {/* Create sheet */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <UpsertAgentSheetContent
          setIsOpen={setIsCreateOpen}
          singleV2OverhaulEnabled={singleV2OverhaulEnabled}
          isSuperAdmin={isSuperAdmin}
        />
      </Sheet>

      {/* Migration dialog */}
      <AlertDialog
        open={isMigrateOpen}
        onOpenChange={(open) => {
          setIsMigrateOpen(open)
          if (!open) setMigratingAgent(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Migrar para Single v2?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  O agente{' '}
                  <span className="font-medium text-foreground">
                    {migratingAgent?.name}
                  </span>{' '}
                  passará a usar a versão avançada, que inclui:
                </p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center gap-2">
                    <ChevronsUpIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Bloqueio de respostas com preço inventado pela IA
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronsUpIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Envio automático de imagens de produtos
                  </li>
                  <li className="flex items-center gap-2">
                    <ChevronsUpIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    Fallback de segurança em caso de falha da IA
                  </li>
                </ul>
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-400">
                    <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                    Migração automática de tools
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-500">
                    As seguintes ações serão removidas das etapas e
                    reconfiguradas como ações globais, disponíveis em qualquer
                    momento da conversa.
                  </p>
                  <ul className="mt-2 space-y-1">
                    {[
                      'Transferir para atendente',
                      'Atualizar contato',
                      'Atualizar negócio',
                      'Criar tarefa',
                    ].map((label) => (
                      <li
                        key={label}
                        className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-500"
                      >
                        <Wrench className="h-3 w-3 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta ação pode ser revertida a qualquer momento.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMigrating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleMigrate} disabled={isMigrating}>
              {isMigrating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Migrar para v2'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog — suporta fluxo de grupo (requiresGroupDecision) */}
      <DeleteAgentDialog
        agent={deletingAgent}
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) setDeletingAgent(null)
        }}
        allAgents={allAgents}
      />
    </>
  )
}
