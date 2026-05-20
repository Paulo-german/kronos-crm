'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/_components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Textarea } from '@/_components/ui/textarea'
import { Label } from '@/_components/ui/label'
import { cn } from '@/_lib/utils'
import { completeTaskWithOutcome } from '@/_actions/task/complete-task-with-outcome'
import { toggleTaskStatus } from '@/_actions/task/toggle-task-status'
import {
  TASK_OUTCOME_OPTIONS,
  getOutcomeLabel,
} from '@/_lib/task/outcome-config'

// Mapa de label amigável por TaskType
const TASK_TYPE_LABEL: Record<string, string> = {
  CALL: 'ligação',
  MEETING: 'reunião',
  WHATSAPP: 'mensagem',
  VISIT: 'visita',
  EMAIL: 'e-mail',
  TASK: 'tarefa',
}

const outcomeFormSchema = z.object({
  outcomeType: z.string().min(1, 'Selecione um resultado'),
  outcomeNotes: z.string().optional(),
})

type OutcomeFormValues = z.infer<typeof outcomeFormSchema>

interface TaskOutcomeDialogProps {
  task: { id: string; title: string; type: string } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted?: () => void
}

export function TaskOutcomeDialog({
  task,
  open,
  onOpenChange,
  onCompleted,
}: TaskOutcomeDialogProps) {
  const form = useForm<OutcomeFormValues>({
    resolver: zodResolver(outcomeFormSchema),
    defaultValues: { outcomeType: '', outcomeNotes: '' },
  })

  const { execute: executeComplete, isPending: isCompleting } = useAction(
    completeTaskWithOutcome,
    {
      onSuccess: () => {
        const outcomeType = form.getValues('outcomeType')
        const label = task ? getOutcomeLabel(task.type, outcomeType) : ''
        toast.success(`Tarefa concluída: ${label}`)
        form.reset()
        onOpenChange(false)
        onCompleted?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao concluir tarefa.')
      },
    },
  )

  const { execute: executeSkip, isPending: isSkipping } = useAction(
    toggleTaskStatus,
    {
      onSuccess: () => {
        toast.success('Tarefa concluída.')
        form.reset()
        onOpenChange(false)
        onCompleted?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao concluir tarefa.')
      },
    },
  )

  const isPending = isCompleting || isSkipping
  const options = task
    ? (TASK_OUTCOME_OPTIONS[task.type] ?? TASK_OUTCOME_OPTIONS['TASK'])
    : []
  const typeLabel = task ? (TASK_TYPE_LABEL[task.type] ?? 'tarefa') : 'tarefa'

  const onSubmit = (values: OutcomeFormValues) => {
    if (!task) return
    executeComplete({
      id: task.id,
      outcomeType: values.outcomeType,
      outcomeNotes: values.outcomeNotes || null,
    })
  }

  const handleSkip = () => {
    if (!task) return
    executeSkip({ id: task.id })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="mb-4">
          <DialogTitle>Como foi a {typeLabel}?</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Opções de resultado */}
            <FormField
              control={form.control}
              name="outcomeType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="grid grid-cols-2 gap-2"
                    >
                      {options.map((option) => {
                        const Icon = option.icon
                        const isSelected = field.value === option.value
                        return (
                          <Label
                            key={option.value}
                            htmlFor={`outcome-${option.value}`}
                            className={cn(
                              'flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors',
                              isSelected
                                ? option.positive
                                  ? 'border-kronos-green bg-kronos-green/10 text-kronos-green'
                                  : 'border-destructive bg-destructive/10 text-destructive'
                                : 'border-border bg-card text-muted-foreground hover:border-border-strong hover:bg-muted/50',
                            )}
                          >
                            <RadioGroupItem
                              value={option.value}
                              id={`outcome-${option.value}`}
                              className="sr-only"
                            />
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="leading-tight">
                              {option.label}
                            </span>
                          </Label>
                        )
                      })}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas opcionais */}
            <FormField
              control={form.control}
              name="outcomeNotes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Observações, próximos passos..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col items-end gap-1 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={isPending}
              >
                {isSkipping && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Concluir sem registrar
              </Button>
              <Button
                type="submit"
                disabled={!form.watch('outcomeType') || isPending}
              >
                {isCompleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar e Concluir
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
