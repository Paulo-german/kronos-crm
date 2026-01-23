'use client'

import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TaskDto } from '@/_data-access/task/get-tasks'

import {
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
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { createTask } from '@/_actions/task/create-task'
import { updateTask } from '@/_actions/task/update-task'
import {
  createTaskSchema,
  CreateTaskInput,
} from '@/_actions/task/create-task/schema'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { cn } from '@/_lib/utils'
import { Calendar } from '@/_components/ui/calendar'

interface UpsertTaskDialogContentProps {
  defaultValues?: TaskDto
  setIsOpen: (isOpen: boolean) => void
}

export function UpsertTaskDialogContent({
  defaultValues,
  setIsOpen,
}: UpsertTaskDialogContentProps) {
  const isEditing = !!defaultValues

  const { execute: executeCreate, isExecuting: isCreating } = useAction(
    createTask,
    {
      onSuccess: () => {
        toast.success('Tarefa criada com sucesso.')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Ocorreu um erro.')
      },
    },
  )

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(
    updateTask,
    {
      onSuccess: () => {
        toast.success('Tarefa atualizada.')
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Ocorreu um erro.')
      },
    },
  )

  const isExecuting = isCreating || isUpdating

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      dueDate: defaultValues?.dueDate
        ? new Date(defaultValues.dueDate)
        : undefined,
      dealId: defaultValues?.dealId || undefined,
    },
  })

  // Hack para garantir que o defaultValues seja reativo se mudar (ex: abrir outro dialog)
  // Mas como o dialog é desmontado/remontado, geralmente não precisa.

  const onSubmit = (data: CreateTaskInput) => {
    if (isEditing && defaultValues?.id) {
      executeUpdate({ ...data, id: defaultValues.id })
    } else {
      executeCreate(data)
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          {defaultValues ? 'Editar Tarefa' : 'Nova Tarefa'}
        </DialogTitle>
        <DialogDescription>
          {defaultValues
            ? 'Faça alterações na sua tarefa.'
            : 'Crie uma nova tarefa para acompanhar seus progressos.'}
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField<CreateTaskInput, 'title'>
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título</FormLabel>
                <FormControl>
                  <Input placeholder="Reunião com cliente..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField<CreateTaskInput, 'dueDate'>
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de Vencimento</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value || undefined}
                      onSelect={(date: Date | undefined) =>
                        field.onChange(date)
                      }
                      disabled={(date) => date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  )
}
