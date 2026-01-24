'use client'

import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { Label } from '@/_components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Briefcase,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useEffect, useState } from 'react'
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
  FormDescription,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Switch } from '@/_components/ui/switch'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Calendar } from '@/_components/ui/calendar'
import { cn } from '@/_lib/utils'

import { createTask } from '@/_actions/task/create-task'
import { updateTask } from '@/_actions/task/update-task'
import {
  createTaskSchema,
  CreateTaskInput,
} from '@/_actions/task/create-task/schema'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'

interface UpsertTaskDialogContentProps {
  defaultValues?: TaskDto
  dealOptions: DealOptionDto[]
  setIsOpen: (isOpen: boolean) => void
}

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  TASK: <CheckCircle2 className="mr-2 h-4 w-4 text-slate-500" />,
  MEETING: <Users className="mr-2 h-4 w-4 text-blue-500" />,
  CALL: <Phone className="mr-2 h-4 w-4 text-green-500" />,
  WHATSAPP: <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />,
  VISIT: <Briefcase className="mr-2 h-4 w-4 text-purple-500" />,
  EMAIL: <Mail className="mr-2 h-4 w-4 text-yellow-500" />,
}

const TASK_TYPE_LABELS: Record<string, string> = {
  TASK: 'Tarefa',
  MEETING: 'Reunião',
  CALL: 'Ligação',
  WHATSAPP: 'WhatsApp',
  VISIT: 'Visita',
  EMAIL: 'E-mail',
}

export function UpsertTaskDialogContent({
  defaultValues,
  setIsOpen,
  dealOptions,
}: UpsertTaskDialogContentProps) {
  const isEditing = !!defaultValues
  const [openCombobox, setOpenCombobox] = useState(false)

  // Extrair hora inicial se for edição
  const initialTime = defaultValues?.dueDate
    ? format(new Date(defaultValues.dueDate), 'HH:mm')
    : ''

  const [timeValue, setTimeValue] = useState(initialTime)

  const { execute: executeCreate, isExecuting: isCreating } = useAction(
    createTask,
    {
      onSuccess: () => {
        toast.success('Tarefa criada com sucesso.')
        form.reset()
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
        form.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Ocorreu um erro.')
      },
    },
  )

  const isExecuting = isCreating || isUpdating

  const defaultValuesParsed: CreateTaskInput = defaultValues
    ? {
        title: defaultValues.title,
        dealId: defaultValues.dealId,
        isCompleted: defaultValues.isCompleted,
        type: (defaultValues.type as CreateTaskInput['type']) ?? 'TASK',
        dueDate: defaultValues.dueDate
          ? new Date(defaultValues.dueDate)
          : undefined,
      }
    : {
        title: '',
        isCompleted: false,
        type: 'TASK',
        dealId: undefined,
        dueDate: undefined,
      }

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: defaultValuesParsed,
  })

  const onSubmit = (data: CreateTaskInput) => {
    // Merge Data e Hora
    const finalDate = data.dueDate

    if (finalDate && timeValue) {
      const [hours, minutes] = timeValue.split(':').map(Number)
      finalDate.setHours(hours)
      finalDate.setMinutes(minutes)
    } else if (finalDate) {
      // Se só tem data sem hora definida...
    }

    const payload = { ...data, dueDate: finalDate }

    if (isEditing && defaultValues?.id) {
      executeUpdate({ ...payload, id: defaultValues.id })
    } else {
      executeCreate(payload)
    }
  }

  return (
    <DialogContent className="sm:max-w-[500px]">
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
          <div className="flex gap-4">
            {/* TIPO DE TAREFA */}
            <FormField<CreateTaskInput, 'type'>
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="w-[180px]">
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TASK_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center">
                            {TASK_TYPE_ICONS[key]}
                            <span className="ml-2">{label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TÍTULO */}
            <FormField<CreateTaskInput, 'title'>
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Ligar para cliente..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField<CreateTaskInput, 'dealId'>
            control={form.control}
            name="dealId"
            render={({ field }) => (
              <FormItem className="flex flex-[1.5] flex-col">
                <FormLabel>Vincular a Negócio (Opcional)</FormLabel>
                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          'w-full justify-between',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        {field.value
                          ? dealOptions.find((deal) => deal.id === field.value)
                              ?.title
                          : 'Procurar negócio...'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar negócio..." />
                      <CommandList>
                        <CommandEmpty>Nenhum negócio encontrado.</CommandEmpty>
                        <CommandGroup>
                          {/* Opção None/Limpar */}
                          <CommandItem
                            value="none"
                            onSelect={() => {
                              form.setValue('dealId', null)
                              setOpenCombobox(false)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                !field.value ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            Original (Sem vínculo)
                          </CommandItem>

                          {dealOptions.map((deal) => (
                            <CommandItem
                              value={deal.title}
                              key={deal.id}
                              onSelect={() => {
                                form.setValue('dealId', deal.id)
                                setOpenCombobox(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  deal.id === field.value
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {deal.title}
                              {deal.contactName && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({deal.contactName})
                                </span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-end gap-4">
            {/* DATA */}
            <FormField<CreateTaskInput, 'dueDate'>
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-1 flex-col">
                  <FormLabel>Data</FormLabel>
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

            {/* HORA */}
            <div className="w-24">
              <Label className="mb-2 block">Hora</Label>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
              />
            </div>
          </div>

          {/* SWITCH COMPLETED */}
          <FormField<CreateTaskInput, 'isCompleted'>
            control={form.control}
            name="isCompleted"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-md border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Tarefa Concluída</FormLabel>
                  <FormDescription>
                    Marcar se a tarefa já foi finalizada.
                  </FormDescription>
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
