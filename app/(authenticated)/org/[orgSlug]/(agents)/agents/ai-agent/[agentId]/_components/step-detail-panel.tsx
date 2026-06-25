'use client'

import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Brain, Trash2 } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { Button } from '@/_components/ui/button'
import { cn } from '@/_lib/utils'
import { useTrainingProgress } from '../_hooks/use-training-progress'
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
import { Textarea } from '@/_components/ui/textarea'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import StepActionBuilder from './step-action-builder'
import StepAutomationsSection from './step-automations-section'
import { createStep } from '@/_actions/agent/create-step'
import { updateStep } from '@/_actions/agent/update-step'
import { deleteStep } from '@/_actions/agent/delete-step'
import {
  createStepSchema,
  type CreateStepFormInput,
} from '@/_actions/agent/create-step/schema'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { AutoTaskItem } from '@/_actions/agent/shared/step-fields-schema'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

interface StepDetailPanelProps {
  step?: AgentStepDto
  agentId: string
  canManage: boolean
  pipelineStages: PipelineStageOption[]
  pipelines: OrgPipelineDto[]
  onCreateSuccess: () => void
  onDeleteSuccess: () => void
  onSaveSuccess?: () => void
  excludeGlobalTools?: boolean
  agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'
  previousStepsLifecycleTriggers?: string[]
  agentVersion?: 'single-v1' | 'single-v2'
}

const StepDetailPanel = ({
  step,
  agentId,
  canManage,
  pipelineStages,
  pipelines,
  onCreateSuccess,
  onDeleteSuccess,
  onSaveSuccess,
  excludeGlobalTools = false,
  agentMode,
  previousStepsLifecycleTriggers,
  agentVersion,
}: StepDetailPanelProps) => {
  const isEditing = !!step?.id
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { progress, visible, isError, start, complete, fail } =
    useTrainingProgress()

  const form = useForm<CreateStepFormInput>({
    resolver: zodResolver(createStepSchema),
    defaultValues: {
      agentId,
      name: step?.name ?? '',
      objective: step?.objective ?? '',
      actions: step?.actions ?? [],
      keyQuestion: step?.keyQuestion ?? '',
      messageTemplate: step?.messageTemplate ?? '',
      lifecycleTrigger: step?.lifecycleTrigger ?? null,
      lifecycleDealPipelineId: step?.lifecycleDealPipelineId ?? null,
      autoDealStageId: step?.autoDealStageId ?? null,
      autoTasks: step?.autoTasks ?? null,
    },
  })

  const watchedLifecycleTrigger = useWatch({
    control: form.control,
    name: 'lifecycleTrigger',
  })

  const watchedActions = useWatch({
    control: form.control,
    name: 'actions',
  })

  const watchedAutoDealStageId = useWatch({
    control: form.control,
    name: 'autoDealStageId',
  })

  const watchedAutoTasks = useWatch({
    control: form.control,
    name: 'autoTasks',
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createStep,
    {
      onExecute: () => start(),
      onSuccess: () => {
        toast.success('Nova etapa adicionada ao treinamento do agente!')
        complete()
        onCreateSuccess()
        // Notifica o painel de chat para auto-reset (nova etapa afeta o comportamento)
        onSaveSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Não foi possível criar a etapa.')
        fail()
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateStep,
    {
      onExecute: () => start(),
      onSuccess: () => {
        toast.success('Agente treinado com o novo processo!')
        form.reset(form.getValues())
        complete()
        // Notifica o painel de chat para auto-reset
        onSaveSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(
          error.serverError || 'Falha ao treinar o agente com esta etapa.',
        )
        fail()
      },
    },
  )

  const { execute: executeDelete, isPending: isDeleting } = useAction(
    deleteStep,
    {
      onSuccess: () => {
        toast.success('Etapa removida do fluxo de treinamento.')
        setIsDeleteOpen(false)
        onDeleteSuccess()
        // Notifica o painel de chat para auto-reset (etapa removida afeta o comportamento)
        onSaveSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Não foi possível remover a etapa.')
      },
    },
  )

  const onSubmit = (data: CreateStepFormInput) => {
    if (isEditing && step?.id) {
      executeUpdate({
        id: step.id,
        agentId,
        name: data.name,
        objective: data.objective,
        actions: data.actions ?? [],
        keyQuestion: data.keyQuestion,
        messageTemplate: data.messageTemplate,
        lifecycleTrigger: data.lifecycleTrigger,
        lifecycleDealPipelineId: data.lifecycleDealPipelineId,
        autoDealStageId: data.autoDealStageId,
        autoTasks: data.autoTasks,
      })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  const onValidationError = () => {
    toast.error('Preencha todos os campos obrigatórios antes de salvar.')
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onValidationError)}
          className="flex flex-col"
        >
          <div className="space-y-5 p-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Etapa *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Qualificação"
                      disabled={!canManage}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objective"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instruções e Contexto (Prompt) *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que o agente deve fazer nesta etapa..."
                      className="min-h-[160px] resize-y"
                      disabled={!canManage}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {canManage && agentVersion === 'single-v2' && (
              <StepAutomationsSection
                autoDealStageId={watchedAutoDealStageId ?? null}
                autoTasks={(watchedAutoTasks ?? null) as AutoTaskItem[] | null}
                onAutoDealStageIdChange={(val) =>
                  form.setValue('autoDealStageId', val, { shouldDirty: true })
                }
                onAutoTasksChange={(val) =>
                  form.setValue('autoTasks', val, { shouldDirty: true })
                }
                pipelineStages={pipelineStages}
              />
            )}

            {canManage && (
              <StepActionBuilder
                value={(watchedActions ?? []) as StepAction[]}
                onChange={(actions) =>
                  form.setValue('actions', actions, { shouldDirty: true })
                }
                pipelineStages={pipelineStages}
                excludeGlobalTools={excludeGlobalTools}
                agentMode={agentMode}
                previousStepsLifecycleTriggers={previousStepsLifecycleTriggers}
                currentLifecycleTrigger={watchedLifecycleTrigger ?? null}
                onLifecycleTriggerChange={(val) =>
                  form.setValue('lifecycleTrigger', val as CreateStepFormInput['lifecycleTrigger'], {
                    shouldDirty: true,
                  })
                }
                agentVersion={agentVersion}
              />
            )}

            <FormField
              control={form.control}
              name="keyQuestion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pergunta-chave (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Qual o CNPJ da empresa?"
                      className="min-h-[80px] resize-y"
                      disabled={!canManage}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="messageTemplate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template de mensagem (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Obrigado! Vou agendar uma demonstração para você..."
                      className="min-h-[80px] resize-y"
                      disabled={!canManage}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-medium">Avançar ciclo ao atingir esta etapa</p>
              <FormField
                control={form.control}
                name="lifecycleTrigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio de destino</FormLabel>
                    <Select
                      disabled={!canManage}
                      onValueChange={(value) =>
                        field.onChange(value === 'none' ? null : value)
                      }
                      value={field.value ?? 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Nenhum</SelectItem>
                        {/* COLD nunca é destino de avanço (não se move alguém PARA frio),
                            mas LEAD sim — é o salto de uma lista fria que respondeu ao agente. */}
                        {LIFECYCLE_STAGE_ORDER.filter(
                          (stage) => stage !== LifecycleStage.COLD,
                        ).map((stage) => {
                          const cfg = LIFECYCLE_STAGE_CONFIG[stage]
                          return (
                            <SelectItem key={stage} value={stage}>
                              <span className="flex items-center gap-2">
                                <cfg.icon className={`h-3.5 w-3.5 ${cfg.colorClassName}`} />
                                {cfg.label}
                              </span>
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedLifecycleTrigger === LifecycleStage.OPPORTUNITY && (
                <FormField
                  control={form.control}
                  name="lifecycleDealPipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Pipeline para criação do deal{' '}
                        <span className="font-normal text-muted-foreground">
                          (opcional)
                        </span>
                      </FormLabel>
                      <Select
                        disabled={!canManage}
                        onValueChange={(value) =>
                          field.onChange(value === 'default' ? null : value)
                        }
                        value={field.value ?? 'default'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pipeline padrão da organização" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="default">
                            Pipeline padrão da organização
                          </SelectItem>
                          {pipelines.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Se não selecionado, será usado o pipeline padrão da
                        organização.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <p className="text-xs text-muted-foreground">
                O contato avançará para este estágio automaticamente quando a
                conversa atingir esta etapa.
              </p>
            </div>
          </div>

          {/* Rodapé fixo com ações */}
          {canManage && (
            <div className="relative flex items-center justify-between gap-2 overflow-hidden border-t p-4">
              {visible && (
                <div
                  className="absolute inset-x-0 top-0 h-0.5 transition-all ease-out"
                  style={{
                    width: `${progress}%`,
                    transitionDuration: progress < 100 ? '1200ms' : '300ms',
                    background: isError
                      ? 'hsl(var(--destructive))'
                      : 'linear-gradient(90deg, var(--kronos-purple), var(--kronos-cyan), var(--kronos-green))',
                  }}
                />
              )}
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Etapa
                </Button>
              ) : (
                <div />
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isPending || (isEditing && !form.formState.isDirty)}
              >
                <Brain
                  className={cn('mr-2 h-4 w-4', isPending && 'animate-pulse')}
                />
                {isPending
                  ? isEditing
                    ? 'Treinando...'
                    : 'Criando...'
                  : isEditing
                    ? 'Treinar Agente'
                    : 'Criar Etapa'}
              </Button>
            </div>
          )}
        </form>
      </Form>

      {isEditing && (
        <ConfirmationDialog
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          title="Excluir etapa?"
          description={
            <p>
              Você está prestes a remover a etapa{' '}
              <span className="font-bold text-foreground">{step.name}</span>.
              Esta ação não pode ser desfeita.
            </p>
          }
          icon={<Trash2 />}
          variant="destructive"
          onConfirm={() => executeDelete({ id: step.id, agentId })}
          isLoading={isDeleting}
          confirmLabel="Confirmar Exclusão"
        />
      )}
    </>
  )
}

export default StepDetailPanel
