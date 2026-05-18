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
  UserIcon,
  BriefcaseIcon,
  ScissorsIcon,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { ptBR } from 'date-fns/locale'
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { AppointmentDto } from '@/_data-access/appointment/get-appointments'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { ServiceDto } from '@/_data-access/service/get-services'
import type { SlotDto } from '@/_data-access/professional/slot-utils'
import { getSlotsByDateAction } from '@/_actions/professional/get-slots-by-date'

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
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'

import { createAppointment } from '@/_actions/appointment/create-appointment'
import { updateContact } from '@/_actions/contact/update-contact'
import { searchDeals } from '@/_actions/deal/search-deals'
import { searchContacts } from '@/_actions/contact/search-contacts'
import {
  createAppointmentFormSchema,
  CreateAppointmentInput,
} from '@/_actions/appointment/create-appointment/schema'
import type { UpdateAppointmentInput } from '@/_actions/appointment/update-appointment/schema'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Switch } from '@/_components/ui/switch'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/_components/ui/alert'

const SAO_PAULO_TZ = 'America/Sao_Paulo'

interface UpsertAppointmentDialogContentProps {
  defaultValues?: AppointmentDto
  members: AcceptedMemberDto[]
  contactOptions: ContactOptionDto[]
  services: ServiceDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateAppointmentInput) => void
  isUpdating?: boolean
  fixedDealId?: string
  focusField?: 'dealId'
}

export function UpsertAppointmentDialogContent({
  defaultValues,
  setIsOpen,
  members,
  onUpdate,
  isUpdating: isUpdatingProp = false,
  fixedDealId,
  contactOptions,
  services,
  focusField,
}: UpsertAppointmentDialogContentProps) {
  const isEditing = !!defaultValues

  // --------------------------------------------------------------------------
  // Estado: busca de negócio (deal) com debounce
  // --------------------------------------------------------------------------
  const [openDealCombobox, setOpenDealCombobox] = useState(false)
  const [dealSearch, setDealSearch] = useState('')
  const [selectedDealTitle, setSelectedDealTitle] = useState<string | null>(
    defaultValues?.dealTitle ?? null,
  )
  const [dealResults, setDealResults] = useState<
    Array<{ id: string; title: string; contactId: string | null; contactName: string | null }>
  >([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --------------------------------------------------------------------------
  // Estado: comboboxes de contato e serviço
  // --------------------------------------------------------------------------
  const [openContactCombobox, setOpenContactCombobox] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<ContactOptionDto[]>([])
  const contactDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [openServiceCombobox, setOpenServiceCombobox] = useState(false)

  // --------------------------------------------------------------------------
  // Estado: atribuição rápida de responsável ao contato
  // --------------------------------------------------------------------------
  const [openAssignOwnerPopover, setOpenAssignOwnerPopover] = useState(false)
  const [assignOwnerSearch, setAssignOwnerSearch] = useState('')
  // Rastreia contatos que tiveram responsável atribuído inline nessa sessão
  const [localContactOwners, setLocalContactOwners] = useState<Record<string, string>>({})
  // Ref para capturar o contactId no momento do dispatch e evitar stale closure no onSuccess
  const assignOwnerContactIdRef = useRef<string | null>(null)

  // --------------------------------------------------------------------------
  // Estado exclusivo do booking widget
  // --------------------------------------------------------------------------
  const [selectedDay, setSelectedDay] = useState<Date | null>(
    defaultValues?.startDate ? new Date(defaultValues.startDate) : null,
  )
  const [filterProfessionalId, setFilterProfessionalId] = useState<string | null>(
    defaultValues?.professionalId ?? null,
  )
  const [slots, setSlots] = useState<SlotDto[]>([])
  const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null)

  const MIN_SEARCH_CHARS = 3

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const { execute: executeSearch, isPending: isSearching } = useAction(
    searchDeals,
    {
      onSuccess: ({ data }) => {
        if (data) setDealResults(data)
      },
    },
  )

  const { execute: executeContactSearch, isPending: isSearchingContacts } = useAction(
    searchContacts,
    {
      onSuccess: ({ data }) => {
        if (data) setContactResults(data)
      },
    },
  )

  const { execute: fetchSlots, isPending: isLoadingSlots } = useAction(
    getSlotsByDateAction,
    {
      onSuccess: ({ data }) => {
        if (data) setSlots(data)
        else setSlots([])
      },
      onError: () => setSlots([]),
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

  const handleContactSearchChange = useCallback(
    (value: string) => {
      setContactSearch(value)

      if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current)

      if (value.length < MIN_SEARCH_CHARS) {
        setContactResults([])
        return
      }

      contactDebounceRef.current = setTimeout(() => {
        executeContactSearch({ query: value })
      }, 300)
    },
    [executeContactSearch],
  )

  // Limpar timeouts no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current)
    }
  }, [])

  // Foco programático em campo específico (sincronização com DOM — uso legítimo de useEffect)
  useEffect(() => {
    if (!focusField) return
    const node = document.querySelector<HTMLElement>(`[data-field="${focusField}"]`)
    if (!node) return
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    node.focus()
  }, [focusField])

  const { execute: executeAssignOwner, isPending: isAssigningOwner } = useAction(
    updateContact,
    {
      onSuccess: () => {
        // Usa a ref em vez do closure de watchedContactId para garantir que registramos
        // o owner no contato correto mesmo que o usuário tenha trocado o contato
        // enquanto o request estava em voo.
        const contactIdAtDispatch = assignOwnerContactIdRef.current
        if (contactIdAtDispatch) {
          setLocalContactOwners((prev) => ({ ...prev, [contactIdAtDispatch]: 'assigned' }))
        }
        toast.success('Responsável atribuído com sucesso.')
        setOpenAssignOwnerPopover(false)
        setAssignOwnerSearch('')
        assignOwnerContactIdRef.current = null
      },
      onError: ({ error }) => {
        assignOwnerContactIdRef.current = null
        toast.error(error.serverError || 'Erro ao atribuir responsável.')
      },
    },
  )

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

  // Garante userId não-nulo antes de usar como value no Select (membros PENDING podem ter userId null)
  const assignableMembers = members.filter(
    (member): member is typeof member & { userId: string } =>
      member.userId !== null && !!member.user?.fullName,
  )

  const defaultValuesParsed: CreateAppointmentInput = defaultValues
    ? {
        // Agendamentos legados sem type explícito são tratados como MEETING
        type: (defaultValues.type as 'MEETING' | 'BOOKING') ?? 'MEETING',
        // contactId null indica registro legado pré-backfill — tratado como não preenchido no form
        contactId: defaultValues.contactId ?? undefined,
        title: defaultValues.title,
        description: defaultValues.description ?? undefined,
        startDate: new Date(defaultValues.startDate),
        endDate: defaultValues.endDate ? new Date(defaultValues.endDate) : undefined,
        dealId: defaultValues.dealId ?? undefined,
        autoCreateDeal: false,
        serviceId: defaultValues.serviceId ?? undefined,
        professionalId: defaultValues.professionalId ?? undefined,
        assignedTo: defaultValues.assignedTo,
      }
    : {
        type: 'MEETING',
        contactId: undefined,
        title: '',
        description: '',
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 60 * 1000), // +1h
        dealId: fixedDealId || undefined,
        autoCreateDeal: false,
        assignedTo: undefined,
      }

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(createAppointmentFormSchema),
    defaultValues: defaultValuesParsed,
  })

  // --------------------------------------------------------------------------
  // Watch reativo para campos que disparam lógica condicional
  // --------------------------------------------------------------------------
  const watchedType = form.watch('type')
  const watchedServiceId = form.watch('serviceId')
  const watchedStartDate = form.watch('startDate')
  const watchedAutoCreateDeal = form.watch('autoCreateDeal')
  const watchedContactId = form.watch('contactId')

  // Verifica se o contato selecionado tem responsável (relevante para BOOKING).
  // Checa estado local primeiro — atualizado quando responsável é atribuído inline.
  const contactHasOwner = useMemo(() => {
    if (!watchedContactId) return null
    if (localContactOwners[watchedContactId]) return true
    const contact =
      contactResults.find((option) => option.id === watchedContactId) ??
      contactOptions.find((option) => option.id === watchedContactId)
    if (!contact) return null
    return !!contact.assignedTo
  }, [watchedContactId, contactOptions, contactResults, localContactOwners])

  // Membros filtrados pela busca no popover de atribuição de responsável
  const filteredAssignableMembers = useMemo(() => {
    if (!assignOwnerSearch) return assignableMembers
    const term = assignOwnerSearch.toLowerCase()
    return assignableMembers.filter(
      (member) =>
        member.user?.fullName?.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term),
    )
  }, [assignableMembers, assignOwnerSearch])

  // --------------------------------------------------------------------------
  // Derivados: agrupamento de serviços por categoria
  // --------------------------------------------------------------------------
  const servicesByCategory = services.reduce<Record<string, ServiceDto[]>>(
    (accumulator, service) => {
      // Serviços sem categoria são agrupados sob "Sem categoria" — bucket único
      // para não quebrar render quando categoryName é null.
      const category = service.categoryName ?? 'Sem categoria'
      const existing = accumulator[category] ?? []
      existing.push(service)
      return { ...accumulator, [category]: existing }
    },
    {},
  )

  // Contato selecionado (para exibir no trigger do combobox)
  // Busca em contactResults primeiro (busca server-side) e fallback em contactOptions
  const selectedContact =
    contactResults.find((contact) => contact.id === watchedContactId) ??
    contactOptions.find((contact) => contact.id === watchedContactId)

  // Serviço selecionado (para exibir no trigger do combobox)
  const selectedServiceId = form.watch('serviceId')
  const selectedService = services.find(
    (service) => service.id === selectedServiceId,
  )

  // Profissionais ativos vinculados ao serviço selecionado
  const serviceProfessionals = useMemo(() => {
    if (!selectedService) return []
    return selectedService.professionalServices.filter((ps) => ps.professional.isActive)
  }, [selectedService])

  // Em modo "Qualquer", deduplica slots por startTime mantendo o primeiro (ordem de distribuição)
  const displaySlots = useMemo(() => {
    if (filterProfessionalId) return slots
    const seen = new Set<string>()
    return slots.filter((slot) => {
      if (seen.has(slot.startTime)) return false
      seen.add(slot.startTime)
      return true
    })
  }, [slots, filterProfessionalId])

  // --------------------------------------------------------------------------
  // useEffect: sincroniza selectedDay a partir do watchedStartDate (RHF → estado local).
  // Functional update evita re-render quando apenas a hora muda (ex: seleção de slot).
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (watchedType !== 'BOOKING' || !watchedStartDate) {
      setSelectedDay(null)
      return
    }
    const d = watchedStartDate
    const newDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    setSelectedDay((prev) => {
      if (prev?.getTime() === newDay.getTime()) return prev
      return newDay
    })
  }, [watchedType, watchedStartDate])

  // --------------------------------------------------------------------------
  // useEffect: busca slots disponíveis quando serviceId + selectedDay mudam
  // Único useEffect legítimo — sincroniza com sistema externo (server action)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (watchedType !== 'BOOKING' || !watchedServiceId || !selectedDay) {
      setSlots([])
      return
    }

    setSelectedSlotKey(null)
    fetchSlots({
      serviceId: watchedServiceId,
      date: selectedDay,
      professionalId: filterProfessionalId ?? undefined,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedType, watchedServiceId, selectedDay, filterProfessionalId])

  // --------------------------------------------------------------------------
  // Funções auxiliares do booking widget
  // --------------------------------------------------------------------------

  // Converte iniciais do nome para exibir no Avatar fallback
  function getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  // Selecionar um slot: seta startDate (dia + hora UTC) e professionalId no form.
  // Usa form.getValues para evitar stale closure em selectedDay.
  function selectSlot(slot: SlotDto) {
    const currentDate = form.getValues('startDate')
    if (!currentDate) return
    const [hours, minutes] = slot.startTime.split(':').map(Number)
    const slotDate = new Date(
      Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth(), currentDate.getUTCDate()),
    )
    slotDate.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0)
    form.setValue('startDate', slotDate)
    form.setValue('professionalId', slot.professionalId)
    setSelectedSlotKey(`${slot.professionalId}-${slot.startTime}`)
  }

  const onSubmit = (data: CreateAppointmentInput) => {
    // superRefine garante contactId presente — guard para narrowing de tipo
    if (!data.contactId) return

    const contactId = data.contactId

    if (isEditing && defaultValues?.id) {
      onUpdate?.({ ...data, id: defaultValues.id })
    } else {
      executeCreate({ ...data, contactId })
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

          {/* TIPO DE AGENDAMENTO */}
          <FormField<CreateAppointmentInput, 'type'>
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de agendamento</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={field.value === 'MEETING' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        field.onChange('MEETING')
                        form.setValue('professionalId', undefined)
                        form.setValue('serviceId', undefined)
                        setSlots([])
                        setSelectedDay(null)
                        setSelectedSlotKey(null)
                        setFilterProfessionalId(null)
                      }}
                    >
                      <BriefcaseIcon className="h-3.5 w-3.5" />
                      Comercial
                    </Button>
                    <Button
                      type="button"
                      variant={field.value === 'BOOKING' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 gap-2"
                      onClick={() => {
                        field.onChange('BOOKING')
                        form.setValue('dealId', undefined)
                        form.setValue('endDate', undefined)
                      }}
                    >
                      <ScissorsIcon className="h-3.5 w-3.5" />
                      Serviço
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* CONTATO — primeiro campo de dados, obrigatório para ambos os tipos */}
          <FormField<CreateAppointmentInput, 'contactId'>
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="flex items-center gap-1">
                  Contato <span className="text-destructive">*</span>
                </FormLabel>
                <Popover
                  open={openContactCombobox}
                  onOpenChange={(open) => {
                    setOpenContactCombobox(open)
                    if (!open) {
                      setContactSearch('')
                      setContactResults([])
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
                          form.formState.errors.contactId && 'border-destructive',
                        )}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <UserIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          {selectedContact
                            ? selectedContact.name
                            : 'Selecione um contato...'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Digite pelo menos 3 caracteres..."
                        value={contactSearch}
                        onValueChange={handleContactSearchChange}
                      />
                      <CommandList>
                        {contactSearch.length < MIN_SEARCH_CHARS ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Digite pelo menos 3 caracteres
                          </div>
                        ) : isSearchingContacts ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : contactResults.length === 0 ? (
                          <CommandEmpty>Nenhum contato encontrado.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {contactResults.map((contact) => (
                              <CommandItem
                                key={contact.id}
                                value={contact.id}
                                onSelect={() => {
                                  form.setValue('contactId', contact.id)
                                  setOpenContactCombobox(false)
                                  setContactSearch('')
                                  setContactResults([])
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    contact.id === field.value
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                <span className="flex-1">{contact.name}</span>
                                {contact.phone && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {contact.phone}
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

          {/* ALERTA: contato sem responsável — com botão de atribuição rápida inline */}
          {watchedType === 'BOOKING' && watchedContactId && contactHasOwner === false && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Contato sem responsável</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  Este contato não tem um responsável de vendas. Atribua um para continuar.
                </p>
                <Popover
                  open={openAssignOwnerPopover}
                  onOpenChange={(open) => {
                    setOpenAssignOwnerPopover(open)
                    if (!open) setAssignOwnerSearch('')
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isAssigningOwner}
                      className="border-destructive/50 bg-transparent text-destructive hover:bg-destructive/10"
                    >
                      {isAssigningOwner && (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      )}
                      Atribuir responsável
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar membro..."
                        value={assignOwnerSearch}
                        onValueChange={setAssignOwnerSearch}
                      />
                      <CommandList>
                        {filteredAssignableMembers.length === 0 ? (
                          <CommandEmpty>Nenhum membro encontrado.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredAssignableMembers.map((member) => (
                              <CommandItem
                                key={member.id}
                                value={member.userId}
                                disabled={isAssigningOwner}
                                onSelect={() => {
                                  if (!watchedContactId) return
                                  assignOwnerContactIdRef.current = watchedContactId
                                  executeAssignOwner({
                                    id: watchedContactId,
                                    assignedTo: member.userId,
                                  })
                                }}
                              >
                                <span className="flex-1">{member.user?.fullName}</span>
                                <span className="ml-2 text-xs text-muted-foreground truncate">
                                  {member.email}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </AlertDescription>
            </Alert>
          )}

          {/* NEGÓCIO — MEETING e BOOKING (sem fixedDealId), exceto quando autoCreateDeal está ativo */}
          {(watchedType === 'MEETING' || watchedType === 'BOOKING') && !fixedDealId && !watchedAutoCreateDeal && (
            <FormField<CreateAppointmentInput, 'dealId'>
              control={form.control}
              name="dealId"
              render={({ field }) => (
                <FormItem className="flex flex-col" data-field="dealId" tabIndex={-1}>
                  <FormLabel className="flex items-center gap-1">
                    Negócio <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover
                    open={openDealCombobox}
                    onOpenChange={setOpenDealCombobox}
                  >
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
                                    setOpenDealCombobox(false)
                                    setDealSearch('')
                                    setDealResults([])
                                    // Auto-preencher contato do negócio se ainda não selecionado
                                    if (deal.contactId && !form.getValues('contactId')) {
                                      form.setValue('contactId', deal.contactId)
                                    }
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

          {/* TOGGLE: Criar negociação junto — apenas BOOKING sem fixedDealId */}
          {watchedType === 'BOOKING' && !fixedDealId && (
            <FormField<CreateAppointmentInput, 'autoCreateDeal'>
              control={form.control}
              name="autoCreateDeal"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => {
                          field.onChange(checked)
                          if (checked) {
                            form.setValue('dealId', undefined)
                          }
                        }}
                        disabled={!watchedContactId}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer select-none font-normal">
                      {!watchedContactId
                        ? 'Selecione um contato para habilitar'
                        : 'Criar negociação junto com o agendamento'}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          )}

          {/* SERVIÇO — apenas BOOKING */}
          {watchedType === 'BOOKING' && (
            <FormField<CreateAppointmentInput, 'serviceId'>
              control={form.control}
              name="serviceId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="flex items-center gap-1">
                    Serviço <span className="text-destructive">*</span>
                  </FormLabel>
                  <Popover
                    open={openServiceCombobox}
                    onOpenChange={setOpenServiceCombobox}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            'w-full justify-between',
                            !field.value && 'text-muted-foreground',
                            form.formState.errors.serviceId && 'border-destructive',
                          )}
                        >
                          <span className="truncate">
                            {selectedService
                              ? `${selectedService.name} (${selectedService.duration} min)`
                              : 'Selecione um serviço...'}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar serviço..." />
                        <CommandList>
                          {services.length === 0 ? (
                            <CommandEmpty>
                              Nenhum serviço cadastrado.
                            </CommandEmpty>
                          ) : (
                            Object.entries(servicesByCategory).map(
                              ([categoryName, categoryServices]) => (
                                <CommandGroup
                                  key={categoryName}
                                  heading={categoryName}
                                >
                                  {categoryServices.map((service) => (
                                    <CommandItem
                                      key={service.id}
                                      value={`${service.name} ${categoryName}`}
                                      onSelect={() => {
                                        form.setValue('serviceId', service.id)
                                        // Auto-fill do título se estiver vazio
                                        if (!form.getValues('title')) {
                                          form.setValue('title', service.name)
                                        }
                                        // Limpa seleções do booking widget ao trocar serviço
                                        form.setValue('professionalId', undefined)
                                        setSlots([])
                                        setSelectedSlotKey(null)
                                        setFilterProfessionalId(null)
                                        setOpenServiceCombobox(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          service.id === field.value
                                            ? 'opacity-100'
                                            : 'opacity-0',
                                        )}
                                      />
                                      <span className="flex-1">{service.name}</span>
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {service.duration} min
                                      </span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ),
                            )
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

          {/* SERVICE INFO CARD — exibe detalhes do serviço selecionado */}
          {watchedType === 'BOOKING' && selectedService && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
              <ScissorsIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 font-medium">{selectedService.name}</span>
              <Badge variant="secondary">{selectedService.duration} min</Badge>
              <Badge variant="secondary">
                {Number(selectedService.price).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </Badge>
            </div>
          )}

          {/* DATA DE INÍCIO — BOOKING usa seletor só de dia (hora vem do slot) */}
          {watchedType === 'BOOKING' && (
            <DateOnlyField form={form} name="startDate" label="Data de Início" />
          )}

          {/* FILTRO DE PROFISSIONAL — chips clicáveis após serviço + data selecionados */}
          {watchedType === 'BOOKING' && watchedServiceId && selectedDay && (
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Profissional</p>
              <div className="flex flex-wrap gap-2">
                {/* Chip "Qualquer disponível" */}
                <button
                  type="button"
                  onClick={() => {
                    setFilterProfessionalId(null)
                    setSelectedSlotKey(null)
                    form.setValue('professionalId', undefined)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                    filterProfessionalId === null
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-foreground hover:bg-muted',
                  )}
                >
                  Qualquer disponível
                </button>

                {/* Chip por profissional do serviço */}
                {serviceProfessionals.map((ps) => (
                  <button
                    key={ps.professionalId}
                    type="button"
                    onClick={() => {
                      setFilterProfessionalId(ps.professionalId)
                      setSelectedSlotKey(null)
                      form.setValue('professionalId', ps.professionalId)
                    }}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      filterProfessionalId === ps.professionalId
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:bg-muted',
                    )}
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={ps.professional.avatarUrl ?? ''} />
                      <AvatarFallback className="text-[10px]">
                        {getInitials(ps.professional.name)}
                      </AvatarFallback>
                    </Avatar>
                    {ps.professional.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* HORÁRIOS DISPONÍVEIS — grid de chips após serviço + data selecionados */}
          {watchedType === 'BOOKING' && watchedServiceId && selectedDay && (
            <div className="space-y-2">
              <p className="text-sm font-medium leading-none">Horário disponível</p>

              {isLoadingSlots ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : displaySlots.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum horário disponível para este dia.
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                  {displaySlots.map((slot) => {
                    const key = `${slot.professionalId}-${slot.startTime}`
                    const isSelected = selectedSlotKey === key
                    return (
                      <Button
                        key={key}
                        type="button"
                        size="sm"
                        variant={isSelected ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => selectSlot(slot)}
                      >
                        {slot.startTime}
                      </Button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* DATA DE INÍCIO — apenas MEETING (BOOKING usa o booking widget acima) */}
          {watchedType === 'MEETING' && (
            <DateTimeField form={form} name="startDate" label="Data de Início" />
          )}

          {/* DATA DE FIM — apenas MEETING */}
          {watchedType === 'MEETING' && (
            <DateTimeField form={form} name="endDate" label="Data de Fim" />
          )}

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

          {/* RESPONSÁVEL — apenas MEETING (BOOKING resolve via ctx.userId no servidor) */}
          {watchedType === 'MEETING' && (
            <FormField<CreateAppointmentInput, 'assignedTo'>
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Responsável <span className="text-destructive">*</span>
                  </FormLabel>
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
                          value={member.userId}
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
          )}

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
            <Button
              type="submit"
              disabled={
                isExecuting ||
                (watchedType === 'BOOKING' && watchedContactId !== undefined && contactHasOwner === false) ||
                (watchedType === 'BOOKING' && !selectedSlotKey)
              }
            >
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
 * Reutilizado para startDate e endDate — usado apenas em MEETING
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

/**
 * Seletor de data sem input de hora — usado no BOOKING onde a hora vem do slot selecionado.
 */
function DateOnlyField({
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
                          return <span className="text-destructive">Data inválida</span>
                        }
                        return formatInTimeZone(field.value, SAO_PAULO_TZ, 'dd/MM/yyyy', {
                          locale: ptBR,
                        })
                      } catch {
                        return <span className="text-destructive">Data inválida</span>
                      }
                    })()
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
                selected={field.value}
                onSelect={(date: Date | undefined) => {
                  if (!date) return
                  // Meia-noite UTC do dia selecionado — hora será definida pelo slot
                  const dayStart = new Date(
                    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
                  )
                  field.onChange(dayStart)
                }}
                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
