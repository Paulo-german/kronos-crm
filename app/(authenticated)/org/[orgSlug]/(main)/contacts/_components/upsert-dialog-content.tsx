'use client'

import { Dispatch, SetStateAction } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { createContact } from '@/_actions/contact/create-contact'
import {
  contactSchema,
  type ContactInput,
} from '@/_actions/contact/create-contact/schema'
import type { UpdateContactInput } from '@/_actions/contact/update-contact/schema'
import { updateContactCustomFields } from '@/_actions/contact/update-contact-custom-fields'
import { CompanyCombobox } from './company-combobox'
import { PhoneInput } from '@/_components/form-controls/phone-input'
import {
  LIFECYCLE_STAGE_CONFIG,
  LIFECYCLE_STAGE_ORDER,
} from '@/_lib/lifecycle/lifecycle-stage-config'
import { CAPTURE_CHANNEL_CONFIG } from '@/_lib/lifecycle/capture-channel-config'
import { Loader2 } from 'lucide-react'
import type { MemberRole } from '@prisma/client'
import { CaptureChannel, LifecycleStage } from '@prisma/client'
import type { PipelineStageSimple } from '@/_data-access/pipeline/get-default-pipeline-with-stages'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import { CustomFieldInput } from '@/_components/custom-fields/custom-field-input'
import {
  CONTACT_NAME_MAX,
  CONTACT_EMAIL_MAX,
  CONTACT_PHONE_MAX,
  CONTACT_ROLE_MAX,
  CONTACT_INLINE_DEAL_TITLE_MAX,
} from '@/_lib/constants/field-limits'

interface UpsertContactDialogContentProps {
  defaultValues?: ContactInput & { id?: string }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  companyOptions?: { id: string; name: string }[]
  onUpdate?: (data: UpdateContactInput) => void
  isUpdating?: boolean
  userRole?: MemberRole
  hidePiiFromMembers?: boolean
  pipelineStages?: PipelineStageSimple[]
  customFieldDefinitions?: FieldDefinitionDto[]
  customFieldValues?: Record<string, string | null>
}

const UpsertContactDialogContent = ({
  defaultValues,
  setIsOpen,
  companyOptions = [],
  onUpdate,
  isUpdating: isUpdatingProp = false,
  userRole,
  hidePiiFromMembers = false,
  pipelineStages = [],
  customFieldDefinitions = [],
  customFieldValues = {},
}: UpsertContactDialogContentProps) => {
  const isEditing = !!defaultValues?.id
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  // Ocultar campos PII no modo edição quando: MEMBER + toggle ativo na org
  const isPiiRestricted = userRole === 'MEMBER' && hidePiiFromMembers && isEditing

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: defaultValues || {
      name: '',
      email: '',
      phone: '',
      role: '',
      companyId: undefined,
      isDecisionMaker: false,
      lifecycleStage: undefined,
      firstCaptureChannel: undefined,
      inlineDealTitle: '',
      inlineDealPipelineStageId: pipelineStages[0]?.id ?? undefined,
    },
  })

  // Form separado apenas para campos personalizados — evita conflito com zodResolver do form principal
  const customFieldsForm = useForm<{ customFields: Record<string, string> }>({
    defaultValues: {
      customFields: customFieldDefinitions.reduce<Record<string, string>>(
        (map, definition) => {
          const existingValue = customFieldValues[definition.id]
          map[definition.id] = existingValue ?? ''
          return map
        },
        {},
      ),
    },
  })

  const { execute: executeUpdateCustomFields } = useAction(updateContactCustomFields, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar campos personalizados.')
    },
  })

  // No modo edição enviamos todos os campos (vazio → null) para permitir limpar valores.
  // No modo criação ignoramos vazios, pois não há valor anterior a limpar.
  const buildCustomFieldsPayload = (
    contactId: string,
    mode: 'create' | 'edit',
  ) => {
    const rawCustomFields = customFieldsForm.getValues('customFields')
    const entries = Object.entries(rawCustomFields)

    const values =
      mode === 'edit'
        ? entries.map(([fieldDefinitionId, value]) => ({
            fieldDefinitionId,
            value: value === '' ? null : value,
          }))
        : entries
            .filter(([, value]) => value !== '' && value !== null && value !== undefined)
            .map(([fieldDefinitionId, value]) => ({ fieldDefinitionId, value }))

    if (values.length === 0) return

    executeUpdateCustomFields({ contactId, values })
  }

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createContact,
    {
      onSuccess: ({ data }) => {
        toast.success('Contato criado com sucesso!')
        if (data?.current && data?.limit && data.limit > 0) {
          const pct = data.current / data.limit
          if (pct >= 0.9) {
            toast.warning(
              `Voce esta usando ${data.current} de ${data.limit} contatos. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }

        // Encadeia a gravação dos campos personalizados após a criação do contato
        if (data?.contactId && customFieldDefinitions.length > 0) {
          buildCustomFieldsPayload(data.contactId, 'create')
        }

        form.reset()
        customFieldsForm.reset()
        setIsOpen(false)
        if (data?.dealId) {
          router.push(`/org/${params.orgSlug}/crm/deals/${data.dealId}`)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar contato.')
      },
    },
  )

  const validateRequiredCustomFields = (): boolean => {
    // Limpa erros anteriores antes de revalidar para não manter mensagens stale
    customFieldsForm.clearErrors('customFields')

    const rawCustomFields = customFieldsForm.getValues('customFields')
    const missingFields = customFieldDefinitions.filter(
      (definition) =>
        definition.isRequired &&
        (!rawCustomFields[definition.id] || rawCustomFields[definition.id] === ''),
    )

    missingFields.forEach((definition) => {
      customFieldsForm.setError(`customFields.${definition.id}`, {
        type: 'required',
        message: 'Campo obrigatório.',
      })
    })

    return missingFields.length === 0
  }

  const onSubmit = (data: ContactInput) => {
    if (!validateRequiredCustomFields()) return

    if (isEditing && defaultValues?.id) {
      // Edição: atualiza campos base E campos personalizados em paralelo
      onUpdate?.({ id: defaultValues.id, ...data })
      if (customFieldDefinitions.length > 0) {
        buildCustomFieldsPayload(defaultValues.id, 'edit')
      }
      return
    }

    // Criação: executeCreate → onSuccess encadeia updateContactCustomFields
    executeCreate(data)
  }

  const handleCloseDialog = () => {
    form.reset()
    customFieldsForm.reset()
    setIsOpen(false)
  }

  const isPending = isCreating || isUpdatingProp
  const watchedStage = form.watch('lifecycleStage')
  const needsInlineDeal =
    watchedStage === LifecycleStage.OPPORTUNITY || watchedStage === LifecycleStage.CUSTOMER

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Contato' : 'Novo Contato'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações do contato abaixo.'
            : 'Preencha os dados para adicionar um novo contato.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Nome completo" maxLength={CONTACT_NAME_MAX} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isPiiRestricted ? (
            <p className="col-span-full rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Informações de contato (email, telefone) são gerenciadas por administradores.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        maxLength={CONTACT_EMAIL_MAX}
                        value={field.value || ''}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        placeholder="(11) 99999-9999"
                        maxLength={CONTACT_PHONE_MAX}
                        value={field.value || ''}
                        onChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <FormControl>
                    <CompanyCombobox
                      value={field.value || undefined}
                      onChange={field.onChange}
                      options={companyOptions}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Diretor"
                      maxLength={CONTACT_ROLE_MAX}
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Estágio inicial, canal de captura e negociação inline — apenas na criação */}
          {!isEditing && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="lifecycleStage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estágio inicial</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value || undefined)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Lead (padrão)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LIFECYCLE_STAGE_ORDER.map((stage) => {
                            const cfg = LIFECYCLE_STAGE_CONFIG[stage]
                            return (
                              <SelectItem key={stage} value={stage}>
                                <span className="flex items-center gap-2">
                                  <cfg.icon className={`h-3.5 w-3.5 ${cfg.colorClassName}`} />
                                  {cfg.label}
                                </span>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="firstCaptureChannel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Canal de captura</FormLabel>
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) =>
                          field.onChange(value ? (value as CaptureChannel) : null)
                        }
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Não informado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.values(CaptureChannel) as CaptureChannel[]).map((channel) => {
                            const cfg = CAPTURE_CHANNEL_CONFIG[channel]
                            return (
                              <SelectItem key={channel} value={channel}>
                                <span className="flex items-center gap-2">
                                  <cfg.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                  {cfg.label}
                                </span>
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

              {needsInlineDeal && (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="inlineDealTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Negociação *{' '}
                          <span className="font-normal text-muted-foreground">
                            {watchedStage === LifecycleStage.CUSTOMER
                              ? '(ganha)'
                              : '(em aberto)'}
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Proposta de serviço anual"
                            maxLength={CONTACT_INLINE_DEAL_TITLE_MAX}
                            value={field.value || ''}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inlineDealPipelineStageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etapa do pipeline *</FormLabel>
                        <Select
                          value={field.value ?? ''}
                          onValueChange={(value) => field.onChange(value || undefined)}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a etapa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {pipelineStages.map((stage) => (
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
                </div>
              )}
            </>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="isDecisionMaker"
              render={({ field }) => (
                <FormItem className={`${isPiiRestricted ? '' : 'mt-8'} flex flex-row items-center space-x-3 space-y-0 rounded-md border px-4`}>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="leading-none">
                    <FormLabel>Tomador de decisão</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          {/* Campos personalizados — form separado para evitar conflito com zodResolver do form principal */}
          {customFieldDefinitions.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-foreground">Campos personalizados</p>
              <div className="grid gap-4 md:grid-cols-2">
                {customFieldDefinitions.map((definition) => (
                  <CustomFieldInput
                    key={definition.id}
                    definition={definition}
                    control={customFieldsForm.control}
                    name={`customFields.${definition.id}`}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
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
    </SheetContent>
  )
}

export default UpsertContactDialogContent
