'use client'

import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import type { NumberFormatValues } from 'react-number-format'
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
import {
  dealFormSchema,
  type DealFormInput,
} from '@/_actions/deal/create-deal/schema'
import {
  dealWithContactFormSchema,
  type DealWithContactFormInput,
} from '@/_actions/deal/create-deal-with-contact/schema'
import type { UpdateDealInput } from '@/_actions/deal/update-deal/schema'
import type { ContactDto } from '@/_data-access/contact/get-contacts'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'

interface DealDialogContentProps {
  defaultValues?: Partial<DealFormInput> & { id?: string }
  stages: StageDto[]
  contacts: ContactDto[]
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateDealInput) => void
  isUpdating?: boolean
}

export function DealDialogContent({
  defaultValues,
  stages,
  contacts,
  setIsOpen,
  onUpdate,
  isUpdating: externalIsUpdating,
}: DealDialogContentProps) {
  const isEditing = !!defaultValues?.id
  const [open, setOpen] = useState(false)
  const [contactSearch, setContactSearch] = useState('')

  const MIN_SEARCH_CHARS = 3
  const MAX_RESULTS = 10

  const filteredContacts = useMemo(() => {
    if (contactSearch.length < MIN_SEARCH_CHARS) return []
    const query = contactSearch.toLowerCase()
    return contacts
      .filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.companyName?.toLowerCase().includes(query),
      )
      .slice(0, MAX_RESULTS)
  }, [contacts, contactSearch])

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
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Salvar
                  </div>
                ) : (
                  'Salvar'
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
              <label className="text-sm font-medium leading-none">Contato</label>
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

                {/* Tab: buscar contato existente via combobox */}
                <TabsContent value="existing">
                  <FormField
                    control={createForm.control}
                    name="contactId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                disabled={isPending}
                                className={cn(
                                  'w-full justify-between font-normal',
                                  !field.value && 'text-muted-foreground',
                                )}
                              >
                                {field.value
                                  ? contacts.find(
                                      (contact) => contact.id === field.value,
                                    )?.name
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
                                onValueChange={setContactSearch}
                              />
                              <CommandList>
                                {contactSearch.length < MIN_SEARCH_CHARS ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    Digite pelo menos 3 caracteres
                                  </div>
                                ) : filteredContacts.length === 0 ? (
                                  <CommandEmpty>
                                    Nenhum contato encontrado.
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredContacts.map((contact) => (
                                      <CommandItem
                                        key={contact.id}
                                        value={contact.id}
                                        onSelect={() => {
                                          createForm.setValue(
                                            'contactId',
                                            contact.id,
                                          )
                                          setOpen(false)
                                          setContactSearch('')
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
                                        {contact.name}
                                        {contact.companyName && (
                                          <span className="ml-1 text-xs text-muted-foreground">
                                            ({contact.companyName})
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
                {isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Salvar
                  </div>
                ) : (
                  'Salvar'
                )}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </SheetContent>
  )
}
