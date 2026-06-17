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
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { TaskDto } from '@/_data-access/task/get-tasks'

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
import { TooltipProvider } from '@/_components/ui/tooltip'
import { FieldLabel } from '@/_components/form-controls/field-label'
import { TASK_TITLE_MAX } from '@/_lib/constants/field-limits'
import { TASK_TYPES } from '../_lib/task-types'
import { cn } from '@/_lib/utils'

import { createTask } from '@/_actions/task/create-task'
import { searchDeals } from '@/_actions/deal/search-deals'
import {
  createTaskSchema,
  CreateTaskInput,
} from '@/_actions/task/create-task/schema'
import type { UpdateTaskInput } from '@/_actions/task/update-task/schema'

interface UpsertTaskDialogContentProps {
  defaultValues?: TaskDto
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateTaskInput) => void
  isUpdating?: boolean
  fixedDealId?: string
}

interface DealSearchResult {
  id: string
  title: string
  contactId: string | null
  contactName: string | null
}

const MIN_SEARCH_CHARS = 3
const SEARCH_DEBOUNCE_MS = 300

export function UpsertTaskDialogContent({
  defaultValues,
  setIsOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
  fixedDealId,
}: UpsertTaskDialogContentProps) {
  const isEditing = !!defaultValues

  // Estado: busca de negócio (deal) com debounce server-side
  const [openCombobox, setOpenCombobox] = useState(false)
  const [dealSearch, setDealSearch] = useState('')
  const [dealResults, setDealResults] = useState<DealSearchResult[]>([])
  // Em modo edição, o título do deal já vem em defaultValues.deal.title — usado como fallback para o trigger
  const [selectedDealTitle, setSelectedDealTitle] = useState<string | null>(
    defaultValues?.deal?.title ?? null,
  )
  const dealDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { execute: executeSearch, isPending: isSearching } = useAction(
    searchDeals,
    {
      onSuccess: ({ data }) => {
        if (data) setDealResults(data)
      },
    },
  )

  const handleDealSearchChange = useCallback(
    (value: string) => {
      setDealSearch(value)

      if (dealDebounceRef.current) clearTimeout(dealDebounceRef.current)

      if (value.length < MIN_SEARCH_CHARS) {
        setDealResults([])
        return
      }

      dealDebounceRef.current = setTimeout(() => {
        executeSearch({ query: value })
      }, SEARCH_DEBOUNCE_MS)
    },
    [executeSearch],
  )

  // Limpar timeout no unmount
  useEffect(() => {
    return () => {
      if (dealDebounceRef.current) clearTimeout(dealDebounceRef.current)
    }
  }, [])

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

  // Reseta o formulário ao cancelar para evitar valores stale ao reabrir
  const handleClose = () => {
    form.reset()
    setIsOpen(false)
  }

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
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

      <TooltipProvider>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-4">
              {/* TÍTULO */}
              <FormField<CreateTaskInput, 'title'>
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>
                      <FieldLabel
                        label="Título da tarefa *"
                        tooltip="Descreve a ação a ser realizada. Ex: Ligar para o cliente, Enviar proposta de serviço."
                      />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Ligar para cliente..."
                        maxLength={TASK_TITLE_MAX}
                        {...field}
                      />
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
                    <FormLabel>
                      <FieldLabel
                        label="Tipo"
                        tooltip="Categoria da atividade — tarefa, reunião, ligação, etc. Ajuda a organizar e filtrar a agenda."
                      />
                    </FormLabel>
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
                        {TASK_TYPES.map((taskType) => {
                          const Icon = taskType.icon
                          return (
                            <SelectItem
                              key={taskType.value}
                              value={taskType.value}
                            >
                              <div className="flex items-center">
                                <Icon
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    taskType.iconColor,
                                  )}
                                />
                                <span className="ml-2">{taskType.label}</span>
                              </div>
                            </SelectItem>
                          )
                        })}
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
                    <FormLabel>
                      <FieldLabel
                        label="Negociação vinculada *"
                        tooltip="Negociação à qual esta tarefa pertence. Toda tarefa precisa estar vinculada a um negócio. Digite ao menos 3 caracteres para buscar."
                      />
                    </FormLabel>
                    <Popover
                      open={openCombobox}
                      onOpenChange={(open) => {
                        setOpenCombobox(open)
                        if (!open) {
                          setDealSearch('')
                          setDealResults([])
                        }
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between',
                              !field.value && 'text-muted-foreground',
                              form.formState.errors.dealId &&
                                'border-destructive',
                            )}
                          >
                            {field.value
                              ? (selectedDealTitle ?? 'Negócio não encontrado')
                              : 'Selecione um negócio...'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Digite pelo menos 3 caracteres..."
                            value={dealSearch}
                            onValueChange={handleDealSearchChange}
                          />
                          <CommandList>
                            {dealSearch.length < MIN_SEARCH_CHARS ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Digite pelo menos 3 caracteres
                              </div>
                            ) : isSearching ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : dealResults.length === 0 ? (
                              <CommandEmpty>
                                Nenhum negócio encontrado.
                              </CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {dealResults.map((deal) => (
                                  <CommandItem
                                    value={deal.id}
                                    key={deal.id}
                                    onSelect={() => {
                                      form.setValue('dealId', deal.id)
                                      setSelectedDealTitle(deal.title)
                                      setOpenCombobox(false)
                                      setDealSearch('')
                                      setDealResults([])
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
                            )}
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
                  <FormLabel>
                    <FieldLabel
                      label="Data e hora de vencimento *"
                      tooltip="Prazo para concluir a tarefa, no fuso local. Aparece na agenda e nos lembretes."
                    />
                  </FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground',
                            form.formState.errors.dueDate &&
                              'border-destructive',
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
                              if (
                                field.value &&
                                !isNaN(field.value.getTime())
                              ) {
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

            <SheetFooter className="flex-row justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isExecuting}>
                {isExecuting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    {isEditing ? 'Atualizando...' : 'Criando...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4" />
                    {isEditing ? 'Atualizar Tarefa' : 'Criar Tarefa'}
                  </div>
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </TooltipProvider>
    </SheetContent>
  )
}
