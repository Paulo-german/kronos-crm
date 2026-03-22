'use client'

import { useAction } from 'next-safe-action/hooks'
import { useForm } from 'react-hook-form'
import { Label } from '@/_components/ui/label'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CalendarIcon, Check, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'

const SAO_PAULO_TZ = 'America/Sao_Paulo'
import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'

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
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
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

import { createAppointment } from '@/_actions/appointment/create-appointment'
import { searchDeals } from '@/_actions/deal/search-deals'
import {
  createAppointmentFormSchema,
  CreateAppointmentInput,
} from '@/_actions/appointment/create-appointment/schema'
import type { UpdateAppointmentInput } from '@/_actions/appointment/update-appointment/schema'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'

interface UpsertAppointmentDialogContentProps {
  defaultValues?: AppointmentDto
  dealOptions?: DealOptionDto[]
  members: AcceptedMemberDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateAppointmentInput) => void
  isUpdating?: boolean
  fixedDealId?: string
}

export function UpsertAppointmentDialogContent({
  defaultValues,
  setIsOpen,
  members,
  onUpdate,
  isUpdating: isUpdatingProp = false,
  fixedDealId,
}: UpsertAppointmentDialogContentProps) {
  const isEditing = !!defaultValues

  const [openCombobox, setOpenCombobox] = useState(false)
  const [dealSearch, setDealSearch] = useState('')
  const [selectedDealTitle, setSelectedDealTitle] = useState<string | null>(
    defaultValues?.dealTitle ?? null,
  )
  const [dealResults, setDealResults] = useState<
    Array<{ id: string; title: string; contactName: string | null }>
  >([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MIN_SEARCH_CHARS = 3

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

      if (debounceRef.current) clearTimeout(debounceRef.current)

      if (value.length < MIN_SEARCH_CHARS) {
        setDealResults([])
        return
      }

      debounceRef.current = setTimeout(() => {
        executeSearch({ query: value })
      }, 300)
    },
    [executeSearch],
  )

  // Limpar timeout no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createAppointment,
    {
      onSuccess: () => {
        toast.success('Agendamento criado com sucesso.')
        form.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Ocorreu um erro.')
      },
    },
  )

  const isExecuting = isCreating || isUpdatingProp

  const assignableMembers = members.filter((member) => member.user?.fullName)

  const defaultValuesParsed: CreateAppointmentInput = defaultValues
    ? {
        title: defaultValues.title,
        description: defaultValues.description ?? undefined,
        startDate: new Date(defaultValues.startDate),
        endDate: new Date(defaultValues.endDate),
        dealId: defaultValues.dealId,
        assignedTo: defaultValues.assignedTo,
      }
    : {
        title: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // +1h
        dealId: fixedDealId || '',
        assignedTo: '',
      }

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentFormSchema),
    defaultValues: defaultValuesParsed,
  })

  const onSubmit = (data: CreateAppointmentInput) => {
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
          {defaultValues?.id ? 'Editar Agendamento' : 'Novo Agendamento'}
        </SheetTitle>
        <SheetDescription>
          {defaultValues?.id
            ? 'Faça alterações no seu agendamento.'
            : 'Crie um novo agendamento para acompanhar seus compromissos.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* TÍTULO */}
          <FormField<CreateAppointmentInput, 'title'>
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1">
                  Título <span className="text-destructive">*</span>
                </FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Reunião com cliente..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* NEGÓCIO */}
          {!fixedDealId && (
            <FormField<CreateAppointmentInput, 'dealId'>
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
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
                                  key={deal.id}
                                  value={deal.id}
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

          {/* RESPONSÁVEL */}
          <FormField<CreateAppointmentInput, 'assignedTo'>
            control={form.control}
            name="assignedTo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Responsável</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? undefined}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assignableMembers.map((member) => (
                      <SelectItem
                        key={member.id}
                        value={member.userId as string}
                      >
                        {member.user?.fullName} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* DATAS */}
          <div className="grid grid-cols-2 gap-4">
            {/* DATA DE INÍCIO */}
            <DateTimeField
              form={form}
              name="startDate"
              label="Data de Início"
            />

            {/* DATA DE FIM */}
            <DateTimeField form={form} name="endDate" label="Data de Fim" />
          </div>

          {/* DESCRIÇÃO */}
          <FormField<CreateAppointmentInput, 'description'>
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Detalhes do agendamento..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
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

/**
 * Componente interno para campo de data+hora (Calendar + time input)
 * Reutilizado para startDate e endDate
 */
function DateTimeField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<CreateAppointmentInput>>
  name: 'startDate' | 'endDate'
  label: string
}) {
  return (
    <FormField<CreateAppointmentInput, typeof name>
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="flex items-center gap-1">
            {label} <span className="text-destructive">*</span>
          </FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full pl-3 text-left font-normal',
                    !field.value && 'text-muted-foreground',
                    form.formState.errors[name] && 'border-destructive',
                  )}
                >
                  {field.value ? (
                    (() => {
                      try {
                        if (isNaN(field.value.getTime())) {
                          return (
                            <span className="text-destructive">
                              Data/hora inválida
                            </span>
                          )
                        }
                        return formatInTimeZone(
                          field.value,
                          SAO_PAULO_TZ,
                          "dd/MM/yyyy 'às' HH:mm",
                          {
                            locale: ptBR,
                          },
                        )
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
                    // Extrair hora atual no timezone de SP (ou default 09:00)
                    const currentTime = field.value
                      ? formatInTimeZone(field.value, SAO_PAULO_TZ, 'HH:mm')
                      : '09:00'
                    // Extrair a data selecionada no timezone de SP
                    const selectedDateStr = formatInTimeZone(date, SAO_PAULO_TZ, 'yyyy-MM-dd')
                    // Construir data+hora no timezone de SP e converter para UTC
                    const zonedDateStr = `${selectedDateStr}T${currentTime}:00`
                    const utcDate = fromZonedTime(zonedDateStr, SAO_PAULO_TZ)
                    field.onChange(utcDate)
                  }
                }}
                disabled={(date) => date < new Date('1900-01-01')}
                initialFocus
              />
              <div className="border-t p-3">
                <Label
                  htmlFor={`${name}-time-input`}
                  className="mb-2 block text-sm"
                >
                  Hora
                </Label>
                <Input
                  id={`${name}-time-input`}
                  type="time"
                  value={(() => {
                    try {
                      if (field.value && !isNaN(field.value.getTime())) {
                        return formatInTimeZone(field.value, SAO_PAULO_TZ, 'HH:mm')
                      }
                    } catch {
                      // Se falhar, retorna valor padrão
                    }
                    return '09:00'
                  })()}
                  onChange={(event) => {
                    const timeValue = event.target.value
                    if (!timeValue || !timeValue.includes(':')) {
                      return
                    }

                    const [hoursStr, minutesStr] = timeValue.split(':')
                    const hours = parseInt(hoursStr, 10)
                    const minutes = parseInt(minutesStr, 10)

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

                    // Obter a data atual no timezone de SP para preservar o dia correto
                    const currentDateStr = field.value
                      ? formatInTimeZone(field.value, SAO_PAULO_TZ, 'yyyy-MM-dd')
                      : formatInTimeZone(new Date(), SAO_PAULO_TZ, 'yyyy-MM-dd')

                    // Construir a data+hora no timezone de SP e converter para UTC
                    const zonedDateStr = `${currentDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
                    const utcDate = fromZonedTime(zonedDateStr, SAO_PAULO_TZ)

                    if (isNaN(utcDate.getTime())) {
                      return
                    }

                    field.onChange(utcDate)
                  }}
                />
              </div>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
