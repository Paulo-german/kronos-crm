'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'
import { createStep } from '@/_actions/agent/create-step'
import { updateStep } from '@/_actions/agent/update-step'
import {
  createStepSchema,
  type CreateStepInput,
} from '@/_actions/agent/create-step/schema'
import { TOOL_OPTIONS } from './constants'
import type { AgentStepDto } from '@/_data-access/agent/get-agent-by-id'

interface UpsertStepDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  defaultValues?: AgentStepDto
}

const UpsertStepDialog = ({
  open,
  onOpenChange,
  agentId,
  defaultValues,
}: UpsertStepDialogProps) => {
  const isEditing = !!defaultValues?.id

  const form = useForm<CreateStepInput>({
    resolver: zodResolver(createStepSchema),
    defaultValues: {
      agentId,
      name: defaultValues?.name || '',
      objective: defaultValues?.objective || '',
      allowedActions: defaultValues?.allowedActions || [],
      activationRequirement: defaultValues?.activationRequirement || '',
    },
  })

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

  const onSubmit = (data: CreateStepInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({
        id: defaultValues.id,
        agentId,
        name: data.name,
        objective: data.objective,
        allowedActions: data.allowedActions,
        activationRequirement: data.activationRequirement || null,
      })
    } else {
      executeCreate(data)
    }
  }

  const isPending = isCreating || isUpdating

  const toggleAction = (actionValue: string) => {
    const current = form.getValues('allowedActions') || []
    if (current.includes(actionValue)) {
      form.setValue(
        'allowedActions',
        current.filter((item) => item !== actionValue),
      )
    } else {
      form.setValue('allowedActions', [...current, actionValue])
    }
  }

  const currentActions = form.watch('allowedActions') || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
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

            <div className="space-y-2">
              <Label>Ações Permitidas</Label>
              <div className="space-y-2">
                {TOOL_OPTIONS.filter(
                  (tool) => !('disabled' in tool && tool.disabled),
                ).map((tool) => (
                  <div
                    key={tool.value}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`step-tool-${tool.value}`}
                      checked={currentActions.includes(tool.value)}
                      onCheckedChange={() => toggleAction(tool.value)}
                    />
                    <Label
                      htmlFor={`step-tool-${tool.value}`}
                      className="cursor-pointer text-sm"
                    >
                      {tool.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <FormField
              control={form.control}
              name="activationRequirement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Requisito de Ativação (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Só avançar quando o lead informar CNPJ..."
                      className="min-h-[80px] resize-y"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
