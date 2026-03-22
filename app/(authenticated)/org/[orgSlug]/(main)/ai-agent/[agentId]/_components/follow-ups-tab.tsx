'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Clock,
  Plus,
  Pencil,
  Trash2,
  MessageSquareText,
  Bell,
  GitBranch,
  Zap,
  Loader2,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import { Switch } from '@/_components/ui/switch'
import { Separator } from '@/_components/ui/separator'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { toggleFollowUp } from '@/_actions/follow-up/toggle-follow-up'
import { updateFollowUpExhausted } from '@/_actions/follow-up/update-follow-up-exhausted'
import { updateFollowUpExhaustedSchema } from '@/_actions/follow-up/update-follow-up-exhausted/schema'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { FollowUpDto, ExhaustedAction, ExhaustedConfig } from '@/_data-access/follow-up/types'
import UpsertFollowUpDialog from './upsert-follow-up-dialog'
import DeleteFollowUpDialog from './delete-follow-up-dialog'
import FollowUpBusinessHoursSection from './follow-up-business-hours-section'

// Re-exportar para uso em outros componentes desta pasta
export type { FollowUpDto } from '@/_data-access/follow-up/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  if (minutes < 1440) return `${minutes / 60}h`
  return `${minutes / 1440}d`
}

function getExhaustedLabel(
  action: ExhaustedAction,
  config: ExhaustedConfig | null | undefined,
  pipelineStages: PipelineStageOption[],
): string | null {
  if (action === 'NONE') return null
  if (action === 'NOTIFY_HUMAN') {
    if (config?.notifyTarget === 'specific_number') {
      return `Notificar: ${config.specificPhone ?? 'número específico'}`
    }
    return 'Notificar responsável'
  }
  if (action === 'MOVE_DEAL_STAGE') {
    const stage = pipelineStages.find((s) => s.stageId === config?.targetStageId)
    if (stage) return `Mover para: ${stage.stageName}`
    return 'Mover de estágio'
  }
  return null
}

// ---------------------------------------------------------------------------
// Props & interfaces
// ---------------------------------------------------------------------------

interface FollowUpsTabProps {
  agent: AgentDetailDto & {
    followUpExhaustedAction?: string
    followUpExhaustedConfig?: ExhaustedConfig | null
  }
  followUps: FollowUpDto[]
  pipelineStages: PipelineStageOption[]
  canManage: boolean
  onSaveSuccess?: () => void
  followUpQuota?: { withinQuota: boolean; current: number; limit: number }
}

// ---------------------------------------------------------------------------
// Sub-componente: Card individual de follow-up
// ---------------------------------------------------------------------------

interface FollowUpCardProps {
  followUp: FollowUpDto
  agentSteps: AgentDetailDto['steps']
  canManage: boolean
  onEdit: (followUp: FollowUpDto) => void
  onDelete: (followUp: FollowUpDto) => void
  onToggle: (id: string, agentId: string, isActive: boolean) => void
  isToggling: boolean
}

const FollowUpCard = ({
  followUp,
  agentSteps,
  canManage,
  onEdit,
  onDelete,
  onToggle,
  isToggling,
}: FollowUpCardProps) => {
  const coveredStepNames = followUp.agentStepIds
    .map((id) => agentSteps.find((step) => step.id === id))
    .filter(Boolean)
    .map((step) => step!.name)

  const messagePreview =
    followUp.messageContent.length > 80
      ? `${followUp.messageContent.slice(0, 80)}…`
      : followUp.messageContent

  return (
    <Card className="border-border/50 bg-secondary/20 transition-all hover:bg-secondary/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Badge de ordem */}
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            #{followUp.order + 1}
          </div>

          {/* Conteúdo principal */}
          <div className="min-w-0 flex-1 space-y-2">
            {/* Linha superior: delay + status */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="gap-1 border-border/50 text-xs font-medium"
              >
                <Clock className="h-3 w-3" />
                Após {formatDelay(followUp.delayMinutes)}
              </Badge>
              <Badge
                variant="outline"
                className={
                  followUp.isActive
                    ? 'border-kronos-green/20 bg-kronos-green/10 text-kronos-green'
                    : 'text-muted-foreground'
                }
              >
                {followUp.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>

            {/* Preview da mensagem */}
            <p className="text-sm text-foreground/80">{messagePreview}</p>

            {/* Badges dos steps cobertos */}
            {coveredStepNames.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {coveredStepNames.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs font-normal">
                    {name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ações */}
          {canManage && (
            <div className="flex shrink-0 items-center gap-1">
              <Switch
                checked={followUp.isActive}
                disabled={isToggling}
                onCheckedChange={(checked) =>
                  onToggle(followUp.id, followUp.agentId, checked)
                }
                aria-label={`${followUp.isActive ? 'Desativar' : 'Ativar'} follow-up #${followUp.order + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(followUp)}
                aria-label={`Editar follow-up #${followUp.order + 1}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(followUp)}
                aria-label={`Excluir follow-up #${followUp.order + 1}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Sub-componente: Empty state
// ---------------------------------------------------------------------------

const EmptyFollowUps = ({
  canManage,
  onNew,
}: {
  canManage: boolean
  onNew: () => void
}) => (
  <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border/50 py-14 text-center">
    <div className="relative">
      <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-2xl" />
      <div className="relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/25">
        <MessageSquareText className="size-7 text-primary-foreground" />
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-sm font-medium">Nenhum follow-up configurado</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Configure mensagens automáticas para reengajar clientes que não responderam.
      </p>
    </div>
    {canManage && (
      <Button size="sm" onClick={onNew}>
        <Plus className="mr-2 h-4 w-4" />
        Criar Follow-Up
      </Button>
    )}
  </div>
)

// ---------------------------------------------------------------------------
// Sub-componente: Seção "Ao esgotar follow-ups" (config global do agente)
// ---------------------------------------------------------------------------

type ExhaustedFormValues = z.input<typeof updateFollowUpExhaustedSchema>

interface ExhaustedActionSectionProps {
  agent: FollowUpsTabProps['agent']
  pipelineStages: PipelineStageOption[]
  canManage: boolean
  onSaveSuccess?: () => void
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ExhaustedActionSection = ({
  agent,
  pipelineStages,
  canManage,
  onSaveSuccess,
}: ExhaustedActionSectionProps) => {
  const exhaustedAction = (agent.followUpExhaustedAction ?? 'NONE') as ExhaustedAction
  const exhaustedConfig = agent.followUpExhaustedConfig ?? null

  const form = useForm<ExhaustedFormValues>({
    resolver: zodResolver(updateFollowUpExhaustedSchema),
    defaultValues: {
      agentId: agent.id,
      followUpExhaustedAction: exhaustedAction,
      followUpExhaustedConfig: exhaustedConfig,
    },
  })

  const watchedAction = form.watch('followUpExhaustedAction')
  const watchedNotifyTarget = form.watch('followUpExhaustedConfig.notifyTarget')

  const { execute, isPending } = useAction(updateFollowUpExhausted, {
    onSuccess: () => {
      toast.success('Configuração de esgotamento salva!')
      form.reset(form.getValues())
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao salvar configuração.')
    },
  })

  const handleSubmit = (values: ExhaustedFormValues) => {
    execute(values)
  }

  const exhaustedLabel = getExhaustedLabel(
    exhaustedAction,
    exhaustedConfig,
    pipelineStages,
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-amber-500/10">
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base font-semibold">
                  Ao Esgotar Follow-ups
                </CardTitle>
                <CardDescription>
                  Ação executada quando todas as mensagens forem enviadas sem resposta.
                </CardDescription>
              </div>
              {/* Badge de ação atual configurada */}
              {exhaustedLabel && (
                <Badge
                  variant="outline"
                  className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {exhaustedAction === 'NOTIFY_HUMAN' ? (
                    <Bell className="h-3 w-3" />
                  ) : (
                    <GitBranch className="h-3 w-3" />
                  )}
                  {exhaustedLabel}
                </Badge>
              )}
            </div>
          </CardHeader>

          <Separator className="opacity-50" />

          <CardContent className="space-y-4 pt-4">
            {/* Select: Ação */}
            <FormField
              control={form.control}
              name="followUpExhaustedAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ação</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value ?? 'NONE'}
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.setValue('followUpExhaustedConfig', null)
                      }}
                      disabled={!canManage || isPending}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar ação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE">Nenhuma</SelectItem>
                        <SelectItem value="NOTIFY_HUMAN">Notificar humano</SelectItem>
                        <SelectItem value="MOVE_DEAL_STAGE">Mover deal de estágio</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos condicionais: NOTIFY_HUMAN */}
            {watchedAction === 'NOTIFY_HUMAN' && (
              <div className="space-y-3 rounded-lg border border-border/50 bg-background/50 p-4">
                <FormField
                  control={form.control}
                  name="followUpExhaustedConfig.notifyTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quem notificar</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(value) => {
                            field.onChange(value)
                            if (value === 'deal_assignee') {
                              form.setValue('followUpExhaustedConfig.specificPhone', undefined)
                            }
                          }}
                          disabled={!canManage || isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar destinatário" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="deal_assignee">Responsável pelo deal</SelectItem>
                            <SelectItem value="specific_number">Número específico</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedNotifyTarget === 'specific_number' && (
                  <FormField
                    control={form.control}
                    name="followUpExhaustedConfig.specificPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="5511999999999"
                            disabled={!canManage || isPending}
                            value={field.value ?? ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <p className="text-[0.75rem] text-muted-foreground">
                          Formato internacional sem espaços ou símbolos.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            {/* Campos condicionais: MOVE_DEAL_STAGE */}
            {watchedAction === 'MOVE_DEAL_STAGE' && (
              <div className="rounded-lg border border-border/50 bg-background/50 p-4">
                <FormField
                  control={form.control}
                  name="followUpExhaustedConfig.targetStageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estágio destino</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={field.onChange}
                          disabled={!canManage || isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar estágio" />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelineStages.length === 0 ? (
                              <SelectItem value="_empty" disabled>
                                Nenhum estágio disponível
                              </SelectItem>
                            ) : (
                              pipelineStages.map((stage) => (
                                <SelectItem key={stage.stageId} value={stage.stageId}>
                                  {stage.pipelineName} → {stage.stageName}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {canManage && (
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending || !form.formState.isDirty}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  )
}

// ---------------------------------------------------------------------------
// Componente principal da tab
// ---------------------------------------------------------------------------

const FollowUpsTab = ({
  agent,
  followUps,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  pipelineStages,
  canManage,
  onSaveSuccess,
  followUpQuota,
}: FollowUpsTabProps) => {
  const [isUpsertOpen, setIsUpsertOpen] = useState(false)
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUpDto | null>(null)
  const [deletingFollowUp, setDeletingFollowUp] = useState<FollowUpDto | null>(null)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const { execute: executeToggle, isPending: isToggling } = useAction(toggleFollowUp, {
    onSuccess: () => {
      toast.success('Status do follow-up atualizado!')
      onSaveSuccess?.()
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar status.')
    },
  })

  const handleNew = () => {
    setEditingFollowUp(null)
    setIsUpsertOpen(true)
  }

  const handleEdit = (followUp: FollowUpDto) => {
    setEditingFollowUp(followUp)
    setIsUpsertOpen(true)
  }

  const handleDelete = (followUp: FollowUpDto) => {
    setDeletingFollowUp(followUp)
    setIsDeleteOpen(true)
  }

  const handleToggle = (id: string, agentId: string, isActive: boolean) => {
    executeToggle({ id, agentId, isActive })
  }

  const handleUpsertClose = () => {
    setIsUpsertOpen(false)
    setEditingFollowUp(null)
  }

  const handleDeleteClose = () => {
    setIsDeleteOpen(false)
    setDeletingFollowUp(null)
  }

  const handleSaveSuccess = () => {
    handleUpsertClose()
    onSaveSuccess?.()
  }

  const handleDeleteSuccess = () => {
    handleDeleteClose()
    onSaveSuccess?.()
  }

  const isAtQuotaLimit = followUpQuota !== undefined && !followUpQuota.withinQuota

  return (
    <div className="space-y-6">
      {/* TODO: Seção "Ao Esgotar Follow-ups" desativada temporariamente */}
      {/* <ExhaustedActionSection agent={agent} pipelineStages={pipelineStages} canManage={canManage} onSaveSuccess={onSaveSuccess} /> */}

      {/* Configuração de horário comercial dos follow-ups */}
      <FollowUpBusinessHoursSection
        agent={agent}
        canManage={canManage}
        onSaveSuccess={onSaveSuccess}
      />

      <Separator className="opacity-50" />

      {/* Header da lista de follow-ups */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">Follow-ups</h3>
            <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 px-1.5 py-0 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Beta
            </Badge>
          </div>
          {followUpQuota && followUpQuota.limit > 0 && (
            <p
              className={
                isAtQuotaLimit
                  ? 'text-xs text-destructive'
                  : 'text-xs text-muted-foreground'
              }
            >
              {followUpQuota.current} de {followUpQuota.limit} follow-ups
            </p>
          )}
        </div>
        {canManage && (
          <Button size="sm" onClick={handleNew} disabled={isAtQuotaLimit}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Follow-Up
          </Button>
        )}
      </div>

      {/* Lista de cards ou empty state */}
      {followUps.length === 0 ? (
        <EmptyFollowUps canManage={canManage} onNew={handleNew} />
      ) : (
        <div className="space-y-3">
          {followUps.map((followUp) => (
            <FollowUpCard
              key={followUp.id}
              followUp={followUp}
              agentSteps={agent.steps}
              canManage={canManage}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggle={handleToggle}
              isToggling={isToggling}
            />
          ))}
        </div>
      )}

      {/* Dialog de criação/edição */}
      <UpsertFollowUpDialog
        open={isUpsertOpen}
        onOpenChange={(open) => {
          if (!open) handleUpsertClose()
        }}
        agentId={agent.id}
        agentSteps={agent.steps}
        followUp={editingFollowUp}
        nextOrder={followUps.length}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Dialog de exclusão */}
      {deletingFollowUp && (
        <DeleteFollowUpDialog
          open={isDeleteOpen}
          onOpenChange={(open) => {
            if (!open) handleDeleteClose()
          }}
          followUp={deletingFollowUp}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}

export default FollowUpsTab
