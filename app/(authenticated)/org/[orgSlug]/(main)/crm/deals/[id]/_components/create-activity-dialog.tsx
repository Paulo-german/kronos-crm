'use client'

import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
  FormMessage,
} from '@/_components/ui/form'
import { createActivity } from '@/_actions/deal/create-activity'
import { MANUAL_ACTIVITY_CONFIG, type ManualActivityType } from '@/_lib/deal/activity-config'

interface CreateActivityDialogProps {
  dealId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: ManualActivityType
}

const formSchema = z.object({
  content: z.string().min(1, 'Conteúdo é obrigatório'),
})

type FormValues = z.infer<typeof formSchema>

export function CreateActivityDialog({
  dealId,
  open,
  onOpenChange,
  initialType = 'note',
}: CreateActivityDialogProps) {
  const config = MANUAL_ACTIVITY_CONFIG[initialType]
  const Icon = config.icon

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { content: '' },
  })

  const { execute, isPending } = useAction(createActivity, {
    onSuccess: () => {
      toast.success('Atividade registrada com sucesso!', {
        position: 'bottom-right',
      })
      form.reset()
      onOpenChange(false)
    },
    onError: ({ error }) => {
      const validationMessage = error.validationErrors
        ? Object.values(error.validationErrors)
            .flatMap((field) =>
              Array.isArray((field as { _errors?: string[] })?._errors)
                ? (field as { _errors: string[] })._errors
                : [],
            )
            .join(', ')
        : null
      toast.error(
        error.serverError ?? validationMessage ?? 'Erro ao registrar atividade.',
        { position: 'bottom-right' },
      )
    },
  })

  const onSubmit = (data: FormValues) => {
    execute({ dealId, type: initialType, content: data.content })
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) form.reset()
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-kronos-blue/10">
              <Icon className="h-3.5 w-3.5 text-kronos-blue" />
            </span>
            {config.label}
          </DialogTitle>
          <DialogDescription>
            Registre as informações importantes que ocorreram nesta atividade.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-3">
            <FormField<FormValues, 'content'>
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
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
