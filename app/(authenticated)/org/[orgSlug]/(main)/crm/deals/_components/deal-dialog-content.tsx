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
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import type { NumberFormatValues } from 'react-number-format'
import { cn } from '@/_lib/utils'
import { Label } from '@/_components/ui/label'
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/_components/ui/tabs'
import { PhoneInput } from '@/_components/form-controls/phone-input'
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
} from '@/_actions/deal/create-deal-with-contact/schema'
import type { UpdateDealInput } from '@/_actions/deal/update-deal/schema'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface DealDialogContentProps {
  defaultValues?: Partial<DealFormInput> & { id?: string }
  stages: StageDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateDealInput) => void
  isUpdating?: boolean
}

const MIN_SEARCH_CHARS = 3

export function DealDialogContent({
  defaultValues,
  stages,
  setIsOpen,
  onUpdate,
  isUpdating: externalIsUpdating,
}: DealDialogContentProps) {
  const isEditing = !!defaultValues?.id
  const [open, setOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')
  const [contactResults, setContactResults] = useState<ContactOptionDto[]>([])
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

  // Limpar timeout no unmount para evitar setState após unmount
  useEffect(() => {
    return () => {
      if (contactDebounceRef.current) clearTimeout(contactDebounceRef.current)
    }
  }, [])

  // Formulário de edição: schema simples sem lógica de contato inline
  const editForm = useForm<DealFormInput>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: defaultValues?.title || '',
      stageId: defaultValues?.stageId || stages[0]?.id || '',
      contactId: defaultValues?.contactId || undefined,
      companyId: defaultValues?.companyId || undefined,
      expectedCloseDate: defaultValues?.expectedCloseDate || undefined,
    },
  })

  // Formulário de criação: schema com suporte a contato inline
  const createForm = useForm<DealWithContactFormInput>({
    resolver: zodResolver(dealWithContactFormSchema),
    defaultValues: {
      title: '',
      stageId: stages[0]?.id || '',
      companyId: undefined,
      expectedCloseDate: undefined,
      contactMode: 'existing',
      contactId: undefined,
      contactName: '',
      contactEmail: '',
      contactPhone: '',
    },
  })

  const { execute: executeCreateWithContact, isPending: isCreating } = useAction(
    createDealWithContact,
    {
      onSuccess: () => {
        const contactMode = createForm.getValues('contactMode')
        const message =
          contactMode === 'new'
            ? 'Deal e contato criados com sucesso!'
            : 'Deal criado com sucesso!'
        toast.success(message)
        createForm.reset()
        setIsOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar deal.')
      },
    },
  )

  const { execute: executeInternalUpdate, isPending: isInternalUpdating } =
    useAction(updateDeal, {
      onSuccess: () => {
        toast.success('Deal atualizado com sucesso!')
        setIsOpen(false)
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
      expectedCloseDate: data.expectedCloseDate || undefined,
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
      expectedCloseDate: data.expectedCloseDate || undefined,
      contactMode: data.contactMode,
      // Campos do discriminated union — TypeScript exige o cast pois o tipo
      // é uma intersection e os campos ficam todos opcionais no nível superior
      contactId: data.contactMode === 'existing' ? (data.contactId || undefined) : undefined,
      contactName: data.contactMode === 'new' ? data.contactName : undefined,
      contactEmail: data.contactMode === 'new' ? (data.contactEmail || undefined) : undefined,
      contactPhone: data.contactMode === 'new' ? (data.contactPhone || undefined) : undefined,
    } as DealWithContactFormInput)
  }

  const isPending =
    isCreating || (onUpdate ? !!externalIsUpdating : isInternalUpdating)

  // Valor atual do contactMode para controlar as tabs (apenas no form de criação)
  const contactMode = isEditing ? 'existing' : createForm.watch('contactMode')

  return (
    <SheetContent className="overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Deal' : 'Novo Deal'}</SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do deal.'
            : 'Preencha os dados para criar um novo deal.'}
        </SheetDescription>
      </SheetHeader>

      {isEditing ? (
        // ----------------------------------------------------------------
        // MODO EDIÇÃO: form simples sem lógica de contato inline
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
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Proposta comercial Q1"
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
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
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Proposta comercial Q1"
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
                  <FormLabel>Etapa *</FormLabel>
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
                          <div className="flex items-center gap-2">
                            {stage.name}
                          </div>
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
              <Label>Contato</Label>
              <Tabs
                value={contactMode}
                onValueChange={(value) => {
                  createForm.setValue(
                    'contactMode',
                    value as 'existing' | 'new',
                  )
                  // Limpar campos do modo anterior ao trocar de aba
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
                <TabsList className="grid h-12 w-full grid-cols-2 rounded-md border border-border/50">
                  <TabsTrigger
                    value="existing"
                    className="rounded-md py-2"
                    disabled={isPending}
                  >
                    Buscar existente
                  </TabsTrigger>
                  <TabsTrigger
                    value="new"
                    className="rounded-md py-2"
                    disabled={isPending}
                  >
                    Criar novo
                  </TabsTrigger>
                </TabsList>

                {/* Tab: buscar contato existente via combobox (server-side) */}
                <TabsContent value="existing">
                  <FormField
                    control={createForm.control}
                    name="contactId"
                    render={({ field }) => {
                      // Contato selecionado para exibição no trigger: busca em contactResults
                      // (server-side). Após selecionar, o contato fica em contactResults até
                      // que o popover seja reaberto e os resultados sejam limpos.
                      const selectedContact = contactResults.find(
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

                {/* Tab: criar contato novo inline */}
                <TabsContent value="new">
                  <div className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="contactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Nome do contato *"
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
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="email@exemplo.com"
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
                            <FormControl>
                              <PhoneInput
                                placeholder="(11) 99999-9999"
                                disabled={isPending}
                                value={field.value || ''}
                                onValueChange={(values: NumberFormatValues) =>
                                  field.onChange(values.value)
                                }
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

            <FormField
              control={createForm.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Previsão de fechamento</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      disabled={isPending}
                      value={
                        field.value
                          ? new Date(field.value).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? new Date(e.target.value) : undefined,
                        )
                      }
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </div>
          </form>
        </Form>
      )}
    </SheetContent>
  )
}
