'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Brain, Trash2 } from 'lucide-react'
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
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import StepActionBuilder from './step-action-builder'
import { createStep } from '@/_actions/agent/create-step'
import { updateStep } from '@/_actions/agent/update-step'
import { deleteStep } from '@/_actions/agent/delete-step'
import {
  createStepSchema,
  type CreateStepFormInput,
} from '@/_actions/agent/create-step/schema'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

interface StepDetailPanelProps {
  step?: AgentStepDto
  agentId: string
  canManage: boolean
  pipelineStages: PipelineStageOption[]
  onCreateSuccess: () => void
  onDeleteSuccess: () => void
}

const StepDetailPanel = ({
  step,
  agentId,
  canManage,
  pipelineStages,
  onCreateSuccess,
  onDeleteSuccess,
}: StepDetailPanelProps) => {
  const isEditing = !!step?.id
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { progress, visible, isError, start, complete, fail } = useTrainingProgress()

  const form = useForm<CreateStepFormInput>({
    resolver: zodResolver(createStepSchema),
    defaultValues: {
      agentId,
      name: step?.name ?? '',
      objective: step?.objective ?? '',
      actions: step?.actions ?? [],
      keyQuestion: step?.keyQuestion ?? '',
      messageTemplate: step?.messageTemplate ?? '',
    },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createStep,
    {
      onExecute: () => start(),
      onSuccess: () => {
        toast.success('Nova etapa adicionada ao treinamento do agente!')
        complete()
        onCreateSuccess()
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
        complete()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Falha ao treinar o agente com esta etapa.')
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
        actions: data.actions,
        keyQuestion: data.keyQuestion,
        messageTemplate: data.messageTemplate,
      })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col"
        >
          <div className="p-5 space-y-5">
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

            {canManage && (
              <StepActionBuilder
                value={(form.watch('actions') ?? []) as StepAction[]}
                onChange={(actions) => form.setValue('actions', actions)}
                pipelineStages={pipelineStages}
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
          </div>

          {/* Rodapé fixo com ações */}
          {canManage && (
            <div className="relative border-t p-4 flex items-center justify-between gap-2 overflow-hidden">
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
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Etapa
                </Button>
              ) : (
                <div />
              )}

              <Button type="submit" size="sm" disabled={isPending}>
                <Brain className={cn('mr-2 h-4 w-4', isPending && 'animate-pulse')} />
                {isPending
                  ? isEditing ? 'Treinando...' : 'Criando...'
                  : isEditing ? 'Treinar Agente' : 'Criar Etapa'}
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
