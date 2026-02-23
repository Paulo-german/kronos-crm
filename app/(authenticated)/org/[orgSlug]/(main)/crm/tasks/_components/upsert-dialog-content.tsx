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
import { Dispatch, SetStateAction, useState } from 'react'
import { TaskDto } from '@/_data-access/task/get-tasks'

import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
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
import {
  createTaskSchema,
  CreateTaskInput,
} from '@/_actions/task/create-task/schema'
import type { UpdateTaskInput } from '@/_actions/task/update-task/schema'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'

interface UpsertTaskDialogContentProps {
  defaultValues?: TaskDto
  dealOptions: DealOptionDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateTaskInput) => void
  isUpdating?: boolean
  fixedDealId?: string
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
  onUpdate,
  isUpdating: isUpdatingProp = false,
  fixedDealId,
}: UpsertTaskDialogContentProps) {
  const isEditing = !!defaultValues

  const [openCombobox, setOpenCombobox] = useState(false)

  const { execute: executeCreate, isPending: isCreating } = useAction(
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

  const isExecuting = isCreating || isUpdatingProp

  const defaultValuesParsed: CreateTaskInput = defaultValues
    ? {
        title: defaultValues.title,
        dealId: defaultValues.dealId,
        isCompleted: defaultValues.isCompleted,
        type: (defaultValues.type as CreateTaskInput['type']) ?? 'TASK',
        dueDate: new Date(defaultValues.dueDate),
      }
    : {
        title: '',
        isCompleted: false,
        type: 'TASK',
        dealId: fixedDealId || '',
        dueDate: new Date(),
      }

  const form = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: defaultValuesParsed,
  })

  const onSubmit = (data: CreateTaskInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ ...data, id: defaultValues.id })
    } else {
      executeCreate(data)
    }
  }

  return (
    <SheetContent className="overflow-y-auto sm:max-w-lg">
      <SheetHeader>
        <SheetTitle>
          {defaultValues?.id ? 'Editar Tarefa' : 'Nova Tarefa'}
        </SheetTitle>
        <SheetDescription>
          {defaultValues?.id
            ? 'Faça alterações na sua tarefa.'
            : 'Crie uma nova tarefa para acompanhar seus progressos.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex gap-4">
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
          </div>
          {/* Só renderiza seletor se Deal não for fixo */}
          {!fixedDealId && (
            <FormField<CreateTaskInput, 'dealId'>
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem className="flex flex-[1.5] flex-col">
                  <FormLabel className="flex items-center gap-1">
                    Negócio <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                            form.formState.errors.dealId && 'border-destructive',
                          )}
                        >
                          {field.value
                            ? dealOptions.find((deal) => deal.id === field.value)
                                ?.title
                            : 'Selecione um negócio...'}
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
          )}

          {/* DATA E HORA */}
          <FormField<CreateTaskInput, 'dueDate'>
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem className="flex flex-1 flex-col">
                <FormLabel className="flex items-center gap-1">
                  Data e Hora <span className="text-destructive">*</span>
                </FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                          form.formState.errors.dueDate && 'border-destructive',
                        )}
                      >
                        {field.value ? (
                          (() => {
                            try {
                              // Verifica se a data é válida antes de formatar
                              if (isNaN(field.value.getTime())) {
                                return (
                                  <span className="text-destructive">
                                    Data/hora inválida
                                  </span>
                                )
                              }
                              return format(field.value, "PPP 'às' HH:mm", {
                                locale: ptBR,
                              })
                            } catch {
                              return (
                                <span className="text-destructive">
                                  Data/hora inválida
                                </span>
                              )
                            }
                          })()
                        ) : (
                          <span>Selecione data e hora</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date: Date | undefined) => {
                        if (date) {
                          const currentDate = field.value || new Date()
                          date.setHours(currentDate.getHours() || 9)
                          date.setMinutes(currentDate.getMinutes() || 0)
                          field.onChange(date)
                        }
                      }}
                      disabled={(date) => date < new Date('1900-01-01')}
                      initialFocus
                    />
                    {/* Input de hora DENTRO do Popover */}
                    <div className="border-t p-3">
                      <Label
                        htmlFor="time-input"
                        className="mb-2 block text-sm"
                      >
                        Hora
                      </Label>
                      <Input
                        id="time-input"
                        type="time"
                        value={(() => {
                          try {
                            if (field.value && !isNaN(field.value.getTime())) {
                              return format(field.value, 'HH:mm')
                            }
                          } catch {
                            // Se falhar, retorna valor padrão
                          }
                          return '09:00'
                        })()}
                        onChange={(e) => {
                          const timeValue = e.target.value
                          // Valida se o valor do input é válido (formato HH:mm)
                          if (!timeValue || !timeValue.includes(':')) {
                            return
                          }

                          const [hoursStr, minutesStr] = timeValue.split(':')
                          const hours = parseInt(hoursStr, 10)
                          const minutes = parseInt(minutesStr, 10)

                          // Valida se horas e minutos são números válidos
                          if (
                            isNaN(hours) ||
                            isNaN(minutes) ||
                            hours < 0 ||
                            hours > 23 ||
                            minutes < 0 ||
                            minutes > 59
                          ) {
                            return
                          }

                          const newDate = field.value
                            ? new Date(field.value)
                            : new Date()

                          // Valida se a data base é válida
                          if (isNaN(newDate.getTime())) {
                            return
                          }

                          newDate.setHours(hours)
                          newDate.setMinutes(minutes)
                          field.onChange(newDate)
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

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

          <SheetFooter>
            <Button type="submit" disabled={isExecuting}>
              {isExecuting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  )
}
