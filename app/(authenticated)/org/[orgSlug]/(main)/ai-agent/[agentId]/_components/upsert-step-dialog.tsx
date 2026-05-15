'use client'

import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { LifecycleStage } from '@prisma/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
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
import { Button } from '@/_components/ui/button'
import StepActionBuilder from './step-action-builder'
import { createStep } from '@/_actions/agent/create-step'
import { updateStep } from '@/_actions/agent/update-step'
import {
  createStepSchema,
  type CreateStepFormInput,
} from '@/_actions/agent/create-step/schema'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'

interface UpsertStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  defaultValues?: AgentStepDto
  pipelineStages: PipelineStageOption[]
  pipelines: OrgPipelineDto[]
  agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'
}

const UpsertStepDialog = ({
  open,
  onOpenChange,
  agentId,
  defaultValues,
  pipelineStages,
  pipelines,
  agentMode,
}: UpsertStepDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateStepFormInput>({
    resolver: zodResolver(createStepSchema),
    defaultValues: {
      agentId,
      name: defaultValues?.name || '',
      objective: defaultValues?.objective || '',
      actions: defaultValues?.actions || [],
      keyQuestion: defaultValues?.keyQuestion || '',
      messageTemplate: defaultValues?.messageTemplate || '',
      lifecycleTrigger: defaultValues?.lifecycleTrigger ?? null,
      lifecycleDealPipelineId: defaultValues?.lifecycleDealPipelineId ?? null,
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

  useEffect(() => {
    if (open) {
      form.reset({
        agentId,
        name: defaultValues?.name || '',
        objective: defaultValues?.objective || '',
        actions: defaultValues?.actions || [],
        keyQuestion: defaultValues?.keyQuestion || '',
        messageTemplate: defaultValues?.messageTemplate || '',
        lifecycleTrigger: defaultValues?.lifecycleTrigger ?? null,
        lifecycleDealPipelineId: defaultValues?.lifecycleDealPipelineId ?? null,
      })
    }
  }, [open, defaultValues, agentId, form])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createStep,
    {
      onSuccess: () => {
        toast.success('Etapa criada com sucesso!')
        form.reset()
        onOpenChange(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar etapa.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateStep,
    {
      onSuccess: () => {
        toast.success('Etapa atualizada com sucesso!')
        onOpenChange(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar etapa.')
      },
    },
  )

  const onSubmit = (data: CreateStepFormInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({
        id: defaultValues.id,
        agentId,
        name: data.name,
        objective: data.objective,
        actions: data.actions,
        keyQuestion: data.keyQuestion,
        messageTemplate: data.messageTemplate,
        lifecycleTrigger: data.lifecycleTrigger,
        lifecycleDealPipelineId: data.lifecycleDealPipelineId,
      })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Etapa' : 'Nova Etapa'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados da etapa do processo.'
              : 'Adicione uma nova etapa ao processo do agente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Qualificação" {...field} />
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
                  <FormLabel>Objetivo *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o que o agente deve fazer nesta etapa..."
                      className="min-h-[100px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <StepActionBuilder
              value={(watchedActions ?? []) as StepAction[]}
              onChange={(actions) => form.setValue('actions', actions)}
              pipelineStages={pipelineStages}
              agentMode={agentMode}
            />

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
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border border-border/50 bg-muted/30 p-4">
              <p className="text-sm font-medium">Avançar lifecycle ao atingir esta etapa</p>
              <FormField
                control={form.control}
                name="lifecycleTrigger"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estágio de destino</FormLabel>
                    <Select
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
                        <SelectItem value={LifecycleStage.QUALIFIED}>
                          Qualificado
                        </SelectItem>
                        <SelectItem value={LifecycleStage.OPPORTUNITY}>
                          Oportunidade
                        </SelectItem>
                        <SelectItem value={LifecycleStage.CUSTOMER}>
                          Cliente
                        </SelectItem>
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

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Salvar
                  </div>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

export default UpsertStepDialog
