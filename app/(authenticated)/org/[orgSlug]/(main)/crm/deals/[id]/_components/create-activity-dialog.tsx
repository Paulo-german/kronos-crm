'use client'

import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { createActivity } from '@/_actions/deal/create-activity'
import {
  createActivitySchema,
  type CreateActivityInput,
} from '@/_actions/deal/create-activity/schema'
import { MANUAL_ACTIVITY_CONFIG, type ManualActivityType } from '@/_lib/deal/activity-config'
import { cn } from '@/_lib/utils'

interface CreateActivityDialogProps {
  dealId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ACTIVITY_TYPES = Object.entries(MANUAL_ACTIVITY_CONFIG) as [
  ManualActivityType,
  (typeof MANUAL_ACTIVITY_CONFIG)[ManualActivityType],
][]

export function CreateActivityDialog({
  dealId,
  open,
  onOpenChange,
}: CreateActivityDialogProps) {
  const form = useForm<CreateActivityInput>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      dealId,
      type: 'note',
      content: '',
    },
  })

  const { execute, isPending } = useAction(createActivity, {
    onSuccess: () => {
      toast.success('Atividade registrada com sucesso!', {
        position: 'bottom-right',
      })
      form.reset({ dealId, type: 'note', content: '' })
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao registrar atividade.', {
        position: 'bottom-right',
      })
    },
  })

  const onSubmit = (data: CreateActivityInput) => {
    execute(data)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      form.reset({ dealId, type: 'note', content: '' })
    }
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar atividade</DialogTitle>
          <DialogDescription>
            Registre uma nota, ligação, e-mail ou reunião nesta negociação.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Type picker */}
            <FormField<CreateActivityInput, 'type'>
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <FormControl>
                    <div className="grid grid-cols-4 gap-2">
                      {ACTIVITY_TYPES.map(([key, config]) => {
                        const Icon = config.icon
                        const isSelected = field.value === key
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => field.onChange(key)}
                            className={cn(
                              'flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors',
                              isSelected
                                ? `border-primary ${config.bgColor} ${config.color}`
                                : 'border-border-strong text-muted-foreground hover:bg-accent',
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {config.label}
                          </button>
                        )
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Content */}
            <FormField<CreateActivityInput, 'content'>
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva a atividade..."
                      rows={4}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
