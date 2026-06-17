'use client'

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Check,
  ChevronsUpDown,
  Handshake,
  Loader2,
  PhoneIcon,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import {
  SheetContent,
  SheetDescription,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/_components/ui/tabs'
import { TooltipProvider } from '@/_components/ui/tooltip'
import { PhoneInput } from '@/_components/form-controls/phone-input'
import { FieldLabel } from '@/_components/form-controls/field-label'
import { updateDeal } from '@/_actions/deal/update-deal'
import { createDealWithContact } from '@/_actions/deal/create-deal-with-contact'
import { searchContacts } from '@/_actions/contact/search-contacts'
import {
  dealFormSchema,
  type DealFormInput,
} from '@/_actions/deal/create-deal/schema'
import {
  dealWithContactFormSchema,
  type DealWithContactFormInput,
  type CreateDealWithContactInput,
} from '@/_actions/deal/create-deal-with-contact/schema'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import type { UpdateDealInput } from '@/_actions/deal/update-deal/schema'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import { PRIORITY_OPTIONS } from '../_lib/deal-filters'
import {
  DEAL_TITLE_MAX,
  DEAL_NOTES_MAX,
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
} from '@/_lib/constants/field-limits'

export interface DealMemberOption {
  userId: string
  name: string
}

interface DealDialogContentProps {
  open?: boolean
  defaultValues?: Partial<DealFormInput> & { id?: string }
  stages: StageDto[]
  members?: DealMemberOption[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateDealInput) => void
  isUpdating?: boolean
  // Disparado após criar/editar com sucesso. No Kanban (React Query) é usado para
  // invalidar as queries das colunas, já que a revalidateTag do servidor não as alcança.
  onMutationSuccess?: () => void
}

const MIN_SEARCH_CHARS = 3
const QUOTA_WARNING_THRESHOLD = 0.9

export function DealDialogContent({
  open: isSheetOpen,
  defaultValues,
  stages,
  members = [],
  setIsOpen,
  onUpdate,
  isUpdating: externalIsUpdating,
  onMutationSuccess,
}: DealDialogContentProps) {
  const isEditing = !!defaultValues?.id
  const [open, setOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<ContactOptionDto[]>([])
  const [selectedContactCache, setSelectedContactCache] =
    useState<ContactOptionDto | null>(null)
  // Guarda os dados pendentes quando o telefone já existe e aguarda confirmação
  const [pendingPhoneConfirm, setPendingPhoneConfirm] =
    useState<CreateDealWithContactInput | null>(null)
  const contactDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { execute: executeContactSearch, isPending: isSearchingContacts } =
    useAction(searchContacts, {
      onSuccess: ({ data }) => {
        if (data) setContactResults(data)
      },
    })

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

  useEffect(() => {
    return () => {
      if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current)
    }
  }, [])

  const editForm = useForm<DealFormInput>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      stageId: defaultValues?.stageId || stages[0]?.id || '',
      contactId: defaultValues?.contactId || undefined,
      companyId: defaultValues?.companyId || undefined,
      assignedTo: defaultValues?.assignedTo || undefined,
      priority: defaultValues?.priority || 'medium',
      notes: defaultValues?.notes || '',
    },
  })

  const createForm = useForm<DealWithContactFormInput>({
    resolver: zodResolver(dealWithContactFormSchema),
    defaultValues: {
      title: '',
      stageId: stages[0]?.id || '',
      companyId: undefined,
      assignedTo: undefined,
      priority: 'medium',
      notes: '',
      contactMode: 'existing',
      contactId: undefined,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    },
  })

  // Limpa os dois forms ao fechar sem salvar — evita valores stale na próxima abertura
  useEffect(() => {
    if (!isSheetOpen) {
      editForm.reset()
      createForm.reset()
    }
  }, [isSheetOpen]) // eslint-disable-line react-hooks/exhaustive-deps -- form instances from useForm are stable references

  const { execute: executeCreateWithContact, isPending: isCreating } =
    useAction(createDealWithContact, {
      onSuccess: ({ data, input }) => {
        // Telefone duplicado: pede confirmação ao operador antes de criar
        if (data?.needsPhoneConfirmation) {
          setPendingPhoneConfirm(input)
          return
        }
        const contactMode = createForm.getValues('contactMode')
        const message =
          contactMode === 'new'
            ? 'Deal e contato criados com sucesso!'
            : 'Deal criado com sucesso!'
        toast.success(message)

        // Avisa quando a org está perto do limite de negociações do plano
        if (data?.current && data?.limit && data.limit > 0) {
          const usage = data.current / data.limit
          if (usage >= QUOTA_WARNING_THRESHOLD) {
            toast.warning(
              `Voce esta usando ${data.current} de ${data.limit} negociacoes. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }

        createForm.reset()
        setIsOpen(false)
        onMutationSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar deal.')
      },
    })

  const { execute: executeInternalUpdate, isPending: isInternalUpdating } =
    useAction(updateDeal, {
      onSuccess: () => {
        toast.success('Deal atualizado com sucesso!')
        setIsOpen(false)
        onMutationSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar deal.')
      },
    })

  const onSubmitEdit = (data: DealFormInput) => {
    if (!defaultValues?.id) return

    const updatePayload: UpdateDealInput = {
      id: defaultValues.id,
      title: data.title,
      contactId: data.contactId || null,
      companyId: data.companyId || null,
      assignedTo: data.assignedTo || null,
      priority: data.priority || undefined,
      notes: data.notes || null,
    }

    if (onUpdate) {
      onUpdate(updatePayload)
    } else {
      executeInternalUpdate(updatePayload)
    }
  }

  const onSubmitCreate = (data: DealWithContactFormInput) => {
    executeCreateWithContact({
      title: data.title,
      stageId: data.stageId,
      companyId: data.companyId || undefined,
      assignedTo: data.assignedTo || undefined,
      priority: data.priority || undefined,
      notes: data.notes || undefined,
      contactMode: data.contactMode,
      contactId:
        data.contactMode === 'existing'
          ? data.contactId || undefined
          : undefined,
      contactName: data.contactMode === 'new' ? data.contactName : undefined,
      contactEmail:
        data.contactMode === 'new' ? data.contactEmail || undefined : undefined,
      contactPhone:
        data.contactMode === 'new' ? data.contactPhone || undefined : undefined,
    } as DealWithContactFormInput)
  }

  const isPending =
    isCreating || (onUpdate ? !!externalIsUpdating : isInternalUpdating)

  const contactMode = isEditing ? 'existing' : createForm.watch('contactMode')

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Deal' : 'Novo Deal'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do deal.'
            : 'Preencha os dados para criar um novo deal.'}
        </SheetDescription>
      </SheetHeader>

      <TooltipProvider>
        {isEditing ? (
          // ----------------------------------------------------------------
          // MODO EDIÇÃO
          // ----------------------------------------------------------------
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(onSubmitEdit)}
              className="space-y-4"
            >
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <FieldLabel
                        label="Título da negociação *"
                        tooltip="Nome da negociação. Aparece no pipeline e nas listagens."
                      />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Proposta comercial Q1"
                        maxLength={DEAL_TITLE_MAX}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={editForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <FieldLabel
                          label="Responsável pela negociação"
                          tooltip="Membro da equipe responsável por conduzir esta negociação."
                        />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem
                              key={member.userId}
                              value={member.userId}
                            >
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <FieldLabel
                          label="Prioridade da negociação"
                          tooltip="Nível de urgência da negociação. Ajuda a priorizar o funil."
                        />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? 'medium'}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <FieldLabel
                        label="Anotações internas"
                        tooltip="Contexto interno da negociação. Visível apenas para a equipe."
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações relevantes sobre esta negociação..."
                        className="resize-none"
                        rows={3}
                        maxLength={DEAL_NOTES_MAX}
                        disabled={isPending}
                        {...field}
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
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" />
                      Atualizando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Handshake className="size-4" />
                      Atualizar Negociação
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          // ----------------------------------------------------------------
          // MODO CRIAÇÃO: form com suporte a contato inline via tabs
          // ----------------------------------------------------------------
          <Form {...createForm}>
            <form
              onSubmit={createForm.handleSubmit(onSubmitCreate)}
              className="space-y-4"
            >
              <FormField
                control={createForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <FieldLabel
                        label="Título da negociação *"
                        tooltip="Nome da negociação. Aparece no pipeline e nas listagens."
                      />
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Proposta comercial Q1"
                        maxLength={DEAL_TITLE_MAX}
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={createForm.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <FieldLabel
                        label="Etapa do funil de vendas *"
                        tooltip="Em qual etapa do seu funil de vendas esta negociação começa."
                      />
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Seção de contato: tabs para buscar existente ou criar novo */}
              <div className="space-y-2">
                <Tabs
                  value={contactMode}
                  onValueChange={(value) => {
                    createForm.setValue(
                      'contactMode',
                      value as 'existing' | 'new',
                    )
                    if (value === 'existing') {
                      createForm.setValue('contactName', '')
                      createForm.setValue('contactEmail', '')
                      createForm.setValue('contactPhone', '')
                    } else {
                      createForm.setValue('contactId', undefined)
                      setContactSearch('')
                      setContactResults([])
                    }
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="existing"
                      className="rounded-md py-2"
                      disabled={isPending}
                    >
                      Buscar contato
                    </TabsTrigger>
                    <TabsTrigger
                      value="new"
                      className="rounded-md py-2"
                      disabled={isPending}
                    >
                      Criar novo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="existing">
                    <FormField
                      control={createForm.control}
                      name="contactId"
                      render={({ field }) => {
                        // Cache tem prioridade — persiste após contactResults ser zerado no fechamento do popover.
                        const selectedContact =
                          (selectedContactCache?.id === field.value
                            ? selectedContactCache
                            : null) ??
                          contactResults.find(
                            (contact) => contact.id === field.value,
                          )

                        return (
                          <FormItem className="flex flex-col">
                            <Popover
                              open={open}
                              onOpenChange={(nextOpen) => {
                                setOpen(nextOpen)
                                if (!nextOpen) {
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
                                    aria-expanded={open}
                                    disabled={isPending}
                                    className={cn(
                                      'w-full justify-between border-border bg-input font-normal hover:bg-input/80',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {selectedContact
                                      ? selectedContact.name
                                      : 'Selecione um contato'}
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
                                      <CommandEmpty>
                                        Nenhum contato encontrado.
                                      </CommandEmpty>
                                    ) : (
                                      <CommandGroup>
                                        {contactResults.map((contact) => (
                                          <CommandItem
                                            key={contact.id}
                                            value={contact.id}
                                            onSelect={() => {
                                              createForm.setValue(
                                                'contactId',
                                                contact.id,
                                              )
                                              setSelectedContactCache(contact)
                                              setOpen(false)
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
                                            <span className="flex-1">
                                              {contact.name}
                                            </span>
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
                        )
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="new">
                    <div className="space-y-4">
                      <FormField
                        control={createForm.control}
                        name="contactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              <FieldLabel
                                label="Nome do contato *"
                                tooltip="Será usado para identificar o contato em todo o sistema."
                              />
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome do contato"
                                maxLength={CONTACT_NAME_MAX}
                                disabled={isPending}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={createForm.control}
                          name="contactEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <FieldLabel
                                  label="Email do contato"
                                  tooltip="Ao menos email ou telefone é recomendado. Usado para comunicações e deduplicação."
                                />
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="email@exemplo.com"
                                  maxLength={CONTACT_EMAIL_MAX}
                                  disabled={isPending}
                                  value={field.value || ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={createForm.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>
                                <FieldLabel
                                  label="Telefone do contato"
                                  tooltip="Ao menos email ou telefone é recomendado. Utilizado para WhatsApp e ligações."
                                />
                              </FormLabel>
                              <FormControl>
                                <PhoneInput
                                  maxLength={CONTACT_PHONE_MAX}
                                  disabled={isPending}
                                  value={field.value || ''}
                                  onChange={(value) => field.onChange(value)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={createForm.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <FieldLabel
                          label="Responsável pela negociação"
                          tooltip="Membro da equipe responsável por conduzir esta negociação."
                        />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? undefined}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem
                              key={member.userId}
                              value={member.userId}
                            >
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <FieldLabel
                          label="Prioridade da negociação"
                          tooltip="Nível de urgência da negociação. Ajuda a priorizar o funil."
                        />
                      </FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? 'medium'}
                        disabled={isPending}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={createForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <FieldLabel
                        label="Anotações internas"
                        tooltip="Contexto interno da negociação. Visível apenas para a equipe."
                      />
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Informações relevantes sobre esta negociação..."
                        className="resize-none"
                        rows={3}
                        maxLength={DEAL_NOTES_MAX}
                        disabled={isPending}
                        {...field}
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
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin" />
                      Criando...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Handshake className="size-4" />
                      Criar Negociação
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </TooltipProvider>

      <ConfirmationDialog
        open={!!pendingPhoneConfirm}
        onOpenChange={(open) => !open && setPendingPhoneConfirm(null)}
        title="Telefone já cadastrado"
        description={
          <span>
            Já existe outro contato com este telefone nesta organização. Deseja
            criar mesmo assim?
          </span>
        }
        icon={<PhoneIcon className="h-6 w-6" />}
        confirmLabel="Criar mesmo assim"
        isLoading={isCreating}
        onConfirm={() => {
          if (pendingPhoneConfirm?.contactMode === 'new') {
            executeCreateWithContact({
              ...pendingPhoneConfirm,
              confirmDuplicatePhone: true,
            })
          }
          setPendingPhoneConfirm(null)
        }}
      />
    </SheetContent>
  )
}
