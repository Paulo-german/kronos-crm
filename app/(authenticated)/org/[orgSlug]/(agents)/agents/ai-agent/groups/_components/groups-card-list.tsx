'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  BotIcon,
  CircleIcon,
  EditIcon,
  InboxIcon,
  Loader2,
  MoreHorizontalIcon,
  PlusIcon,
  TrashIcon,
  UsersIcon,
  GitBranchIcon,
} from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/_components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Sheet } from '@/_components/ui/sheet'
import { Switch } from '@/_components/ui/switch'
import { Textarea } from '@/_components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { deleteAgentGroup } from '@/_actions/agent-group/delete-agent-group'
import { updateAgentGroup } from '@/_actions/agent-group/update-agent-group'
import {
  updateAgentGroupSchema,
  type UpdateAgentGroupInput,
} from '@/_actions/agent-group/update-agent-group/schema'
import { getModelLabel } from '@/_lib/ai/models'
import { UpsertGroupSheetContent } from './upsert-group-dialog'
import { DeleteGroupDialog } from './delete-group-dialog'
import type { AgentGroupDto } from '@/_data-access/agent-group/get-agent-groups'
import type { AgentDto } from '@/_data-access/agent/get-agents'

// Limite de workers visíveis no corpo do card
const MAX_VISIBLE_WORKERS = 4
// A partir de quantos workers usar grid 2x2
const GRID_THRESHOLD = 3

interface GroupsCardListProps {
  groups: AgentGroupDto[]
  orgSlug: string
  agents: AgentDto[]
  withinQuota: boolean
}

export function GroupsCardList({
  groups,
  orgSlug,
  agents,
  withinQuota,
}: GroupsCardListProps) {
  const router = useRouter()
  const [editingGroup, setEditingGroup] = useState<AgentGroupDto | null>(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState<AgentGroupDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [togglingGroupId, setTogglingGroupId] = useState<string | null>(null)

  const { execute: executeToggle } = useAction(updateAgentGroup, {
    onSuccess: () => {
      toast.success('Status da equipe atualizado.')
      setTogglingGroupId(null)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao alterar status.')
      setTogglingGroupId(null)
    },
  })

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteAgentGroup,
    {
      onSuccess: () => {
        toast.success('Equipe excluída com sucesso.')
        setIsDeleteOpen(false)
        setDeletingGroup(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir equipe.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateAgentGroup,
    {
      onSuccess: () => {
        toast.success('Equipe atualizada com sucesso.')
        setIsEditOpen(false)
        setEditingGroup(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar equipe.')
      },
    },
  )

  const handleConfirmDelete = () => {
    if (!deletingGroup) return
    executeDelete({ groupId: deletingGroup.id })
  }

  if (groups.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="rounded-full bg-muted p-4">
            <UsersIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Nenhuma equipe criada</h3>
            <p className="text-sm text-muted-foreground">
              Crie uma equipe para organizar seus agentes workers com roteamento
              inteligente.
            </p>
          </div>
          {withinQuota ? (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Criar Equipe
            </Button>
          ) : (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button disabled>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Criar Equipe
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
          <UpsertGroupSheetContent
            setIsOpen={setIsCreateOpen}
            agents={agents}
          />
        </Sheet>
      </>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div
            key={group.id}
            className="cursor-pointer"
            onClick={() =>
              router.push(`/org/${orgSlug}/ai-agent/groups/${group.id}`)
            }
          >
            <Card className="border-border/50 bg-card transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col gap-4 p-5">
                {/* Header: switch + nome + status + modelo + dropdown */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Switch
                          checked={group.isActive}
                          onCheckedChange={() => {
                            setTogglingGroupId(group.id)
                            executeToggle({
                              groupId: group.id,
                              isActive: !group.isActive,
                            })
                          }}
                          disabled={togglingGroupId === group.id}
                          className="scale-75"
                        />
                      </div>
                      <h3 className="text-base font-semibold leading-tight">
                        {group.name}
                      </h3>
                      {group.isActive ? (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-kronos-green/20 bg-kronos-green/10 px-1.5 text-[10px] font-semibold text-kronos-green"
                        >
                          <CircleIcon className="h-1.5 w-1.5 fill-current" />
                          Ativa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 px-1.5 text-[10px] font-semibold"
                        >
                          <CircleIcon className="h-1.5 w-1.5 fill-current" />
                          Inativa
                        </Badge>
                      )}
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {getModelLabel(group.routerModelId)}
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="line-clamp-1 text-sm text-muted-foreground">
                        {group.description}
                      </p>
                    )}
                  </div>

                  <div onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontalIcon className="h-4 w-4" />
                          <span className="sr-only">Abrir menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-1.5"
                          onSelect={() => {
                            setEditingGroup(group)
                            setIsEditOpen(true)
                          }}
                        >
                          <EditIcon className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-1.5 text-destructive focus:text-destructive"
                          onSelect={() => {
                            setDeletingGroup(group)
                            setIsDeleteOpen(true)
                          }}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Corpo: workers com escopo */}
                {group.members.length > 0 ? (
                  <div>
                    <div
                      className={
                        group.members.length >= GRID_THRESHOLD
                          ? 'grid grid-cols-2 gap-2'
                          : 'flex flex-col gap-2'
                      }
                    >
                      {group.members
                        .slice(0, MAX_VISIBLE_WORKERS)
                        .map((member) => {
                          const isEffectivelyActive = member.isActive
                          return (
                            <div
                              key={member.id}
                              className={`flex items-center gap-2 rounded-md border border-border/40 bg-background/50 px-3 py-2 ${!isEffectivelyActive ? 'opacity-50' : ''}`}
                            >
                              <div
                                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                  isEffectivelyActive
                                    ? 'bg-primary/10'
                                    : 'bg-muted'
                                }`}
                              >
                                <BotIcon
                                  className={`h-3 w-3 ${
                                    isEffectivelyActive
                                      ? 'text-primary'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium leading-tight">
                                  {member.agentName}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {member.scopeLabel}
                                </p>
                              </div>
                              {!member.isActive && (
                                <Badge
                                  variant="outline"
                                  className="h-4 shrink-0 px-1 text-[9px]"
                                >
                                  Pausado
                                </Badge>
                              )}
                            </div>
                          )
                        })}
                    </div>
                    {group.memberCount > MAX_VISIBLE_WORKERS && (
                      <p className="mt-1.5 pl-1 text-xs text-muted-foreground">
                        +{group.memberCount - MAX_VISIBLE_WORKERS} worker{group.memberCount - MAX_VISIBLE_WORKERS > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center rounded-md border border-dashed py-3">
                    <span className="text-xs text-muted-foreground">
                      Nenhum worker nesta equipe
                    </span>
                  </div>
                )}

                {/* Footer: stats */}
                <div className="flex items-center gap-4 border-t pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-3.5 w-3.5" />
                    <span>{group.memberCount} worker{group.memberCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <InboxIcon className="h-3.5 w-3.5" />
                    <span>{group.inboxCount} inbox{group.inboxCount !== 1 ? 'es' : ''}</span>
                  </div>
                  {(group.routerConfig?.rules?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1">
                      <GitBranchIcon className="h-3.5 w-3.5" />
                      <span>{group.routerConfig!.rules!.length} regra{group.routerConfig!.rules!.length > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Card de criar equipe */}
        {withinQuota ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="min-h-[100px] cursor-pointer rounded-xl border-2 border-dashed bg-muted/30 transition-colors hover:bg-muted/50"
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
              <div className="rounded-full border-2 border-dashed p-2">
                <PlusIcon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Criar Equipe
              </span>
            </div>
          </button>
        ) : (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="min-h-[100px] cursor-not-allowed rounded-xl border-2 border-dashed bg-muted/30 opacity-50">
                <div className="flex h-full flex-col items-center justify-center gap-2 py-6">
                  <div className="rounded-full border-2 border-dashed p-2">
                    <PlusIcon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    Criar Equipe
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

      {/* Sheet de criação */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <UpsertGroupSheetContent setIsOpen={setIsCreateOpen} agents={agents} />
      </Sheet>

      {/* Dialog de edição rápida */}
      {editingGroup && (
        <EditGroupDialog
          group={editingGroup}
          open={isEditOpen}
          onOpenChange={(open) => {
            setIsEditOpen(open)
            if (!open) setEditingGroup(null)
          }}
          onUpdate={(data) => executeUpdate(data)}
          isUpdating={isUpdating}
        />
      )}

      {/* Dialog de exclusão */}
      {deletingGroup && (
        <DeleteGroupDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            setIsDeleteOpen(open)
            if (!open) setDeletingGroup(null)
          }}
          groupName={deletingGroup.name}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Subcomponente: dialog de edição rápida inline
// ─────────────────────────────────────────────────────────

interface EditGroupDialogProps {
  group: AgentGroupDto
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (data: UpdateAgentGroupInput) => void
  isUpdating: boolean
}

function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onUpdate,
  isUpdating,
}: EditGroupDialogProps) {
  const form = useForm<UpdateAgentGroupInput>({
    resolver: zodResolver(updateAgentGroupSchema),
    defaultValues: {
      groupId: group.id,
      name: group.name,
      description: group.description ?? '',
      isActive: group.isActive,
    },
  })

  const onSubmit = (data: UpdateAgentGroupInput) => {
    onUpdate(data)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar equipe</DialogTitle>
          <DialogDescription>
            Altere as configurações básicas da equipe. Para editar workers e
            router, acesse o detalhe da equipe.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      rows={2}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <FormLabel className="text-sm">Equipe ativa</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Quando inativa, o router não processa novas mensagens.
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isUpdating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
