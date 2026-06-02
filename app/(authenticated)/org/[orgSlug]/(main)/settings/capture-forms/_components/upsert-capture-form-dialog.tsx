'use client'

import { useEffect, useId, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Loader2, Users, CheckIcon, Plus, ShieldCheck, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
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
import { Switch } from '@/_components/ui/switch'
import { Badge } from '@/_components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'
import { Separator } from '@/_components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { createCaptureForm } from '@/_actions/capture-form/create-capture-form'
import { updatePrivacyPolicyUrl } from '@/_actions/organization/update-privacy-policy-url'
import { captureFormBaseSchema, updateCaptureFormSchema } from '@/_actions/capture-form/schema'
import {
  CAPTURE_CONSENT_PREFIX,
  CAPTURE_CONSENT_ANCHOR,
  CAPTURE_CONSENT_SUFFIX,
  CAPTURE_LEGITIMATE_INTEREST_NOTICE,
} from '@/_lib/capture-form/consent-config'
import { MAX_CUSTOM_FIELDS_PER_FORM } from '@/_lib/capture-form/custom-fields-config'
import { DEFAULT_CAPTURE_FIELDS, CAPTURE_FIELD_KEYS, type CaptureFieldKey } from '@/_lib/capture-form/field-config'
import { DEFAULT_CAPTURE_APPEARANCE } from '@/_lib/capture-form/appearance-config'
import { CaptureFormView, getVisibleFieldKeys } from '@/_components/capture-form/capture-form-view'
import type { CaptureFormDto } from '@/_data-access/capture-form/get-capture-forms'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { SquadDto } from '@/_data-access/squad/get-squads'
import type { FieldDefinitionDto } from '@/_lib/custom-fields/types'
import { CaptureFormFieldRow } from './capture-form-field-row'

// z.input<> expõe o shape de entrada do RHF (campos com .default() ficam opcionais no input)
type CreateInput = z.input<typeof captureFormBaseSchema>
type UpdateInput = z.input<typeof updateCaptureFormSchema>

interface UpsertCaptureFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultValues?: CaptureFormDto
  members: AcceptedMemberDto[]
  squads: SquadDto[]
  fieldDefinitions: FieldDefinitionDto[]
  privacyPolicyUrl: string | null
  onUpdate?: (data: UpdateInput) => void
  isUpdating?: boolean
}

const FIELD_LABELS: Record<CaptureFieldKey, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  role: 'Cargo',
}

const FORM_DEFAULTS: CreateInput = {
  name: '',
  fields: DEFAULT_CAPTURE_FIELDS,
  appearance: DEFAULT_CAPTURE_APPEARANCE,
  buttonLabel: 'Enviar',
  successMessage: 'Obrigado! Recebemos seus dados.',
  redirectUrl: '',
  distributionUserIds: [],
  squadId: null,
  isActive: true,
  customFields: [],
  consentRequired: true,
}

export const UpsertCaptureFormDialog = ({
  open,
  onOpenChange,
  defaultValues,
  members,
  squads,
  fieldDefinitions,
  privacyPolicyUrl,
  onUpdate,
  isUpdating = false,
}: UpsertCaptureFormDialogProps) => {
  const isEditing = !!defaultValues?.id
  const dndContextId = useId()
  const [isAddFieldOpen, setIsAddFieldOpen] = useState(false)
  const [orgPrivacyUrl, setOrgPrivacyUrl] = useState(privacyPolicyUrl ?? '')

  const { execute: executeSaveUrl, isPending: isSavingUrl } = useAction(updatePrivacyPolicyUrl, {
    onSuccess: ({ data }) => {
      toast.success('Política de privacidade salva na organização.')
      setOrgPrivacyUrl(data?.privacyPolicyUrl ?? '')
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao salvar URL.')
    },
  })

  const handleUrlBlur = () => {
    const trimmed = orgPrivacyUrl.trim()
    if (trimmed === (privacyPolicyUrl ?? '')) return
    executeSaveUrl({ privacyPolicyUrl: trimmed })
  }

  const form = useForm<CreateInput>({
    resolver: zodResolver(captureFormBaseSchema),
    defaultValues: FORM_DEFAULTS,
  })

  const { fields: customFieldItems, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'customFields',
  })

  const distributionUserIds = form.watch('distributionUserIds')
  const squadId = form.watch('squadId')
  const watchedConsentRequired = form.watch('consentRequired')

  // Valores observados para o preview ao vivo
  const watchedAppearance = form.watch('appearance')
  const watchedFields = form.watch('fields')
  const watchedButtonLabel = form.watch('buttonLabel')

  const assignableMembers = members.filter((member) => member.userId !== null)

  useEffect(() => {
    if (!open) return
    if (defaultValues) {
      form.reset({
        name: defaultValues.name,
        fields: defaultValues.fields,
        appearance: defaultValues.appearance ?? DEFAULT_CAPTURE_APPEARANCE,
        buttonLabel: defaultValues.buttonLabel,
        successMessage: defaultValues.successMessage,
        redirectUrl: defaultValues.redirectUrl ?? '',
        distributionUserIds: defaultValues.distributionUserIds,
        squadId: defaultValues.squadId ?? null,
        isActive: defaultValues.isActive,
        customFields: defaultValues.customFields.map((customField) => ({
          fieldDefinitionId: customField.fieldDefinitionId,
          required: customField.required,
          labelOverride: customField.labelOverride ?? null,
          position: customField.position,
        })),
        consentRequired: defaultValues.consentRequired ?? true,
      })
      return
    }
    // Pré-popula campos obrigatórios da organização ao criar novo form
    const requiredFields = fieldDefinitions
      .filter((definition) => definition.isRequired)
      .map((definition, index) => ({
        fieldDefinitionId: definition.id,
        required: true,
        labelOverride: null,
        position: index,
      }))

    form.reset({ ...FORM_DEFAULTS, customFields: requiredFields })
  }, [open, defaultValues, form, fieldDefinitions])

  const { execute: executeCreate, isExecuting: isCreating } = useAction(createCaptureForm, {
    onSuccess: () => {
      toast.success('Formulário criado com sucesso.')
      onOpenChange(false)
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Erro ao criar formulário.')
    },
  })

  const onSubmit = (data: CreateInput) => {
    // Normalizar positions pelo índice atual antes de enviar
    const normalizedData: CreateInput = {
      ...data,
      customFields: data.customFields?.map((customField, index) => ({
        ...customField,
        position: index,
      })) ?? [],
    }

    if (isEditing && onUpdate) {
      onUpdate({ ...normalizedData, id: defaultValues!.id })
      return
    }
    executeCreate(normalizedData)
  }

  const handleToggleMember = (userId: string) => {
    const current = form.getValues('distributionUserIds')
    const updated = current.includes(userId)
      ? current.filter((existingId) => existingId !== userId)
      : [...current, userId]
    form.setValue('distributionUserIds', updated, { shouldDirty: true })
  }

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = customFieldItems.findIndex((item) => item.fieldDefinitionId === active.id)
    const newIndex = customFieldItems.findIndex((item) => item.fieldDefinitionId === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    move(oldIndex, newIndex)
  }

  // IDs de campos já adicionados ao form
  const addedFieldIds = new Set(customFieldItems.map((item) => item.fieldDefinitionId))

  // FieldDefinitions disponíveis para adicionar (não adicionadas ainda)
  const availableDefinitions = fieldDefinitions.filter(
    (definition) => !addedFieldIds.has(definition.id),
  )

  const handleAddField = (definition: FieldDefinitionDto) => {
    append({
      fieldDefinitionId: definition.id,
      required: definition.isRequired,
      labelOverride: null,
      position: customFieldItems.length,
    })
    setIsAddFieldOpen(false)
  }

  const isPending = isCreating || isUpdating
  const isMissingPrivacyUrl = watchedConsentRequired && !orgPrivacyUrl

  // Mapa de label por fieldDefinitionId (para o row component)
  const definitionLabelById = new Map(
    fieldDefinitions.map((definition) => [definition.id, definition.label]),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar formulário' : 'Novo formulário de captura'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="content" className="w-full">
              <TabsList className="mb-5 mt-2 grid w-full grid-cols-2 h-12 border border-border/50 bg-tab/30 rounded-md">
                <TabsTrigger value="content" className="data-[state=active]:bg-card/80 rounded-md py-2">Conteúdo</TabsTrigger>
                <TabsTrigger value="appearance" className="data-[state=active]:bg-card/80 rounded-md py-2">Aparência</TabsTrigger>
              </TabsList>

              {/* ── Aba Conteúdo ── */}
              <TabsContent value="content" className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome interno</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Landing Page Produto X" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Campos fixos */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Campos do formulário</p>
                  <div className="space-y-2">
                    {CAPTURE_FIELD_KEYS.map((key) => (
                      <div key={key} className="flex items-center gap-4 rounded-md border p-3">
                        <span className="w-20 text-sm text-muted-foreground">{FIELD_LABELS[key]}</span>
                        <div className="flex flex-1 items-center gap-6">
                          <FormField
                            control={form.control}
                            name={`fields.${key}.visible`}
                            render={({ field: f }) => (
                              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={f.value}
                                    onCheckedChange={f.onChange}
                                    disabled={key === 'name'}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs text-muted-foreground">Visível</FormLabel>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${key}.required`}
                            render={({ field: f }) => (
                              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                                <FormControl>
                                  <Switch
                                    checked={f.value}
                                    onCheckedChange={f.onChange}
                                    disabled={key === 'name'}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs text-muted-foreground">Obrigatório</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Campos personalizados */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Campos personalizados</p>
                      <p className="text-xs text-muted-foreground">
                        Adicione campos customizados da organização ao formulário.
                      </p>
                    </div>

                    <Popover open={isAddFieldOpen} onOpenChange={setIsAddFieldOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            customFieldItems.length >= MAX_CUSTOM_FIELDS_PER_FORM ||
                            availableDefinitions.length === 0
                          }
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Adicionar campo
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        {availableDefinitions.length === 0 ? (
                          <p className="px-2 py-1 text-sm text-muted-foreground">
                            Todos os campos já foram adicionados.
                          </p>
                        ) : (
                          availableDefinitions.map((definition) => (
                            <button
                              key={definition.id}
                              type="button"
                              onClick={() => handleAddField(definition)}
                              className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                            >
                              <span className="flex-1 truncate text-left">{definition.label}</span>
                              <Badge variant="secondary" className="text-xs">
                                {definition.type}
                              </Badge>
                            </button>
                          ))
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {customFieldItems.length > 0 && (
                    <DndContext
                      id={dndContextId}
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={customFieldItems.map((item) => item.fieldDefinitionId)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {customFieldItems.map((item, index) => (
                            <CaptureFormFieldRow
                              key={item.fieldDefinitionId}
                              fieldDefinitionId={item.fieldDefinitionId}
                              fieldLabel={definitionLabelById.get(item.fieldDefinitionId) ?? item.fieldDefinitionId}
                              index={index}
                              control={form.control}
                              onRemove={() => remove(index)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}

                  {customFieldItems.length === 0 && fieldDefinitions.length === 0 && (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Nenhum campo personalizado criado para contatos ainda.
                    </p>
                  )}

                  {customFieldItems.length === 0 && fieldDefinitions.length > 0 && (
                    <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                      Clique em &quot;Adicionar campo&quot; para incluir campos personalizados.
                    </p>
                  )}
                </div>

                <Separator />

                {/* Distribuição de leads */}
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Distribuição de leads</p>
                    <p className="text-xs text-muted-foreground">
                      Escolha membros (round-robin) ou um time. Os dois modos são exclusivos.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Select de Squad */}
                    <FormField
                      control={form.control}
                      name="squadId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(value === 'none' ? null : value)
                            }
                            value={field.value ?? 'none'}
                            disabled={distributionUserIds.length > 0}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Sem time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">Sem time</SelectItem>
                              {squads.map((squad) => (
                                <SelectItem key={squad.id} value={squad.id}>
                                  {squad.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Multi-select de membros */}
                    <div className="space-y-2">
                      <Label>Membros específicos</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full justify-start font-normal"
                            disabled={!!squadId}
                          >
                            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                            {distributionUserIds.length === 0
                              ? 'Selecionar membros'
                              : `${distributionUserIds.length} membro(s)`}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          {assignableMembers.length === 0 ? (
                            <p className="px-2 py-1 text-sm text-muted-foreground">
                              Nenhum membro disponível.
                            </p>
                          ) : (
                            assignableMembers.map((member) => {
                              const isSelected = distributionUserIds.includes(member.userId!)
                              return (
                                <button
                                  key={member.userId}
                                  type="button"
                                  onClick={() => handleToggleMember(member.userId!)}
                                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent"
                                >
                                  <Checkbox checked={isSelected} className="pointer-events-none" />
                                  <span className="flex-1 truncate text-left">
                                    {member.user?.fullName ?? member.email}
                                  </span>
                                  {isSelected && <CheckIcon className="h-3.5 w-3.5 text-primary" />}
                                </button>
                              )
                            })
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Badges dos membros selecionados */}
                  {distributionUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {distributionUserIds.map((userId) => {
                        const member = assignableMembers.find((m) => m.userId === userId)
                        return (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="cursor-pointer"
                            onClick={() => handleToggleMember(userId)}
                          >
                            {member?.user?.fullName ?? member?.email ?? userId}
                            <span className="ml-1 opacity-60">×</span>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="buttonLabel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Texto do botão</FormLabel>
                        <FormControl>
                          <Input placeholder="Enviar" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="successMessage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem de sucesso</FormLabel>
                        <FormControl>
                          <Input placeholder="Obrigado! Recebemos seus dados." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="redirectUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL de redirecionamento (opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Seção de Consentimento LGPD/GDPR */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium">Consentimento & Privacidade</p>
                  </div>

                  <FormField
                    control={form.control}
                    name="consentRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-3 rounded-lg border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1">
                          <FormLabel>Exigir consentimento do lead</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Quando ativo, um checkbox de aceite é exibido no formulário público. Base legal = Consentimento (LGPD Art. 7º, II / GDPR Art. 6º(1)(a)). Quando desativado, base legal = Legítimo Interesse.
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />

                  {watchedConsentRequired ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                          Base legal: Autorização do contato
                        </Badge>
                      </div>

                      {orgPrivacyUrl ? (
                        <div className="rounded-md border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
                          {CAPTURE_CONSENT_PREFIX}
                          <a
                            href={orgPrivacyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-foreground underline"
                          >
                            {CAPTURE_CONSENT_ANCHOR}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          {CAPTURE_CONSENT_SUFFIX}
                        </div>
                      ) : (
                        <div className="space-y-2 rounded-md border border-destructive/50 bg-muted/30 p-3">
                          <Label htmlFor="privacy-url" className="text-xs font-medium text-destructive">
                            URL da Política de Privacidade *
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="privacy-url"
                              type="url"
                              placeholder="https://suaempresa.com/privacidade"
                              value={orgPrivacyUrl}
                              onChange={(event) => setOrgPrivacyUrl(event.target.value)}
                              onBlur={handleUrlBlur}
                              disabled={isSavingUrl}
                              className="h-8 text-xs border-destructive/50 focus-visible:ring-destructive"
                            />
                            {isSavingUrl && (
                              <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-xs text-destructive">
                            Obrigatório para exigir consentimento. Será salvo na organização e aplicado a todos os formulários.
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400">
                        Base legal: Interesse legítimo
                      </Badge>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Aba Aparência ── */}
              <TabsContent value="appearance">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {/* Controles (esquerda) */}
                  <div className="space-y-5">
                    {/* Cores */}
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Cores</p>

                      <FormField
                        control={form.control}
                        name="appearance.primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor primária</FormLabel>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="h-9 w-12 cursor-pointer rounded border p-1"
                              />
                              <FormControl>
                                <Input
                                  {...field}
                                  className="font-mono uppercase"
                                  maxLength={7}
                                  onChange={(event) => {
                                    const val = event.target.value
                                    field.onChange(val.startsWith('#') ? val : `#${val}`)
                                  }}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appearance.backgroundColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cor de fundo</FormLabel>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                className="h-9 w-12 cursor-pointer rounded border p-1"
                              />
                              <FormControl>
                                <Input
                                  {...field}
                                  className="font-mono uppercase"
                                  maxLength={7}
                                  onChange={(event) => {
                                    const val = event.target.value
                                    field.onChange(val.startsWith('#') ? val : `#${val}`)
                                  }}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Texto e identidade */}
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Texto e identidade</p>

                      <FormField
                        control={form.control}
                        name="appearance.title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Título (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Fale com nossa equipe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appearance.description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descrição (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Preencha e entraremos em contato." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="appearance.logoUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URL do logo (opcional)</FormLabel>
                            <FormControl>
                              <Input placeholder="https://..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    {/* Estilo de bordas */}
                    <FormField
                      control={form.control}
                      name="appearance.borderStyle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Estilo de bordas</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rounded">Arredondado</SelectItem>
                              <SelectItem value="square">Quadrado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Preview ao vivo (direita) */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="mb-3 text-xs text-muted-foreground">Preview</p>
                    <CaptureFormView
                      appearance={watchedAppearance}
                      fields={watchedFields}
                      buttonLabel={watchedButtonLabel}
                      submitButton={
                        <div className="mt-4 space-y-3">
                          {!watchedConsentRequired && (
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {CAPTURE_LEGITIMATE_INTEREST_NOTICE}
                            </p>
                          )}
                          {watchedConsentRequired && (
                            <div className="flex items-start gap-2">
                              <div className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-sm border border-muted-foreground/40" />
                              <p className="text-xs leading-relaxed text-muted-foreground">
                                {CAPTURE_CONSENT_PREFIX}
                                {orgPrivacyUrl ? (
                                  <span className="underline" style={{ color: watchedAppearance.primaryColor }}>
                                    {CAPTURE_CONSENT_ANCHOR}
                                  </span>
                                ) : (
                                  <span className="font-medium">{CAPTURE_CONSENT_ANCHOR}</span>
                                )}
                                {CAPTURE_CONSENT_SUFFIX}
                              </p>
                            </div>
                          )}
                          <div
                            className="w-full py-2 text-center text-sm font-medium text-white"
                            style={{
                              backgroundColor: watchedAppearance.primaryColor,
                              borderRadius: watchedAppearance.borderStyle === 'rounded' ? '6px' : '2px',
                            }}
                          >
                            {watchedButtonLabel}
                          </div>
                        </div>
                      }
                    >
                      {/* Inputs fake para o preview — cores fixas, independente do tema */}
                      <div className="space-y-3">
                        {getVisibleFieldKeys(watchedFields).map((key) => {
                          const config = watchedFields[key]
                          return (
                            <div key={key}>
                              <label
                                className="mb-1 block text-sm font-medium"
                                style={{ color: watchedAppearance.primaryColor }}
                              >
                                {config.label ?? key}
                                {config.required && (
                                  <span className="ml-1 text-xs">*</span>
                                )}
                              </label>
                              <div
                                className="h-9 border px-3 py-2 text-sm"
                                style={{
                                  backgroundColor: '#f9fafb',
                                  color: '#9ca3af',
                                  borderColor: '#e5e7eb',
                                  borderRadius: watchedAppearance.borderStyle === 'rounded' ? '6px' : '2px',
                                }}
                              >
                                {config.label ?? key}...
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CaptureFormView>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Rodapé com botões de ação — fora das tabs */}
            <div className="mt-6 flex items-center justify-end gap-2 border-t pt-4">
              {isMissingPrivacyUrl && (
                <p className="mr-auto text-xs text-destructive">
                  Adicione a URL da Política de Privacidade para continuar.
                </p>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || isMissingPrivacyUrl}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Salvar' : 'Criar formulário'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
