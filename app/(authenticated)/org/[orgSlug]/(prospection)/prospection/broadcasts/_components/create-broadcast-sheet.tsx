'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/_components/ui/sheet'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import { Checkbox } from '@/_components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { businessHoursConfigSchema } from '@/_actions/agent/update-agent/schema'
import { createBroadcast } from '@/_actions/broadcast/create-broadcast'
import { listWhatsAppTemplates } from '@/_actions/inbox/list-whatsapp-templates'
import { previewSegmentCount } from '@/_actions/segment/preview-segment-count'
import type { EligibleInbox } from '@/_data-access/broadcast/get-eligible-inboxes'
import type { SegmentDto } from '@/_data-access/segment/get-segments'
import type { BroadcastContactOption } from '@/_actions/broadcast/search-broadcast-contacts'
import type { MetaTemplate } from '@/_lib/meta/types'
import { extractVariableIndices } from '@/_lib/meta/template-variables'
import { TemplatePreview } from '@/_components/whatsapp/template-preview'
import { getConnectionLabel } from '../../_lib/broadcast-labels'
import { ContactMultiSelect } from './contact-multi-select'

const MAX_MESSAGE_LENGTH = 4096

const THROTTLE_PRESETS: { value: string; label: string }[] = [
  { value: '60000', label: 'Muito lento — 1 msg / 60s' },
  { value: '30000', label: 'Recomendado — 1 msg / 30s' },
  { value: '15000', label: 'Moderado — 1 msg / 15s' },
  { value: '5000', label: 'Rápido — 1 msg / 5s (maior risco)' },
]

// Dias da semana para o editor de janela de envio (ordem seg→dom)
const WINDOW_DAYS: { key: keyof BroadcastWindowConfig; label: string }[] = [
  { key: 'monday', label: 'Seg' },
  { key: 'tuesday', label: 'Ter' },
  { key: 'wednesday', label: 'Qua' },
  { key: 'thursday', label: 'Qui' },
  { key: 'friday', label: 'Sex' },
  { key: 'saturday', label: 'Sáb' },
  { key: 'sunday', label: 'Dom' },
]

const WINDOW_TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/Sao_Paulo', label: 'Brasília (GMT-3)' },
  { value: 'America/Manaus', label: 'Manaus (GMT-4)' },
  { value: 'America/Rio_Branco', label: 'Rio Branco (GMT-5)' },
  { value: 'America/Noronha', label: 'Fernando de Noronha (GMT-2)' },
]

type BroadcastWindowConfig = z.infer<typeof businessHoursConfigSchema>

// Default da janela: dias úteis 08:00–20:00, sábado 08:00–12:00, domingo off
const DEFAULT_WINDOW_CONFIG: BroadcastWindowConfig = {
  monday: { enabled: true, start: '08:00', end: '20:00' },
  tuesday: { enabled: true, start: '08:00', end: '20:00' },
  wednesday: { enabled: true, start: '08:00', end: '20:00' },
  thursday: { enabled: true, start: '08:00', end: '20:00' },
  friday: { enabled: true, start: '08:00', end: '20:00' },
  saturday: { enabled: true, start: '08:00', end: '12:00' },
  sunday: { enabled: false, start: '08:00', end: '12:00' },
}

const formSchema = z.object({
  inboxId: z.string().min(1, 'Selecione um canal de origem.'),
  name: z.string().min(2, 'Dê um nome com pelo menos 2 caracteres.'),
  messageContent: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  templateName: z.string().optional(),
  templateLanguage: z.string().optional(),
  throttleMs: z.number().int(),
  scheduledFor: z.string().optional(),
  sendingWindowEnabled: z.boolean(),
  sendingWindowTimezone: z.string(),
  sendingWindowConfig: businessHoursConfigSchema,
})

type FormValues = z.infer<typeof formSchema>

type RecipientMode = 'manual' | 'segment'

interface CreateBroadcastSheetProps {
  trigger: React.ReactNode
  inboxes: EligibleInbox[]
  segments: SegmentDto[]
}

export const CreateBroadcastSheet = ({
  trigger,
  inboxes,
  segments,
}: CreateBroadcastSheetProps) => {
  const router = useRouter()
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const [isOpen, setIsOpen] = useState(false)
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('manual')
  const [selectedContacts, setSelectedContacts] = useState<
    BroadcastContactOption[]
  >([])
  const [segmentId, setSegmentId] = useState('')
  const [templates, setTemplates] = useState<MetaTemplate[]>([])
  // Valores das variáveis {{N}} do corpo do template, fixos para todos os
  // contatos do disparo (v1). Persistidos como templateParams na action.
  const [bodyValues, setBodyValues] = useState<string[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inboxId: '',
      name: '',
      messageContent: '',
      templateName: '',
      templateLanguage: '',
      throttleMs: 30000,
      scheduledFor: '',
      sendingWindowEnabled: false,
      sendingWindowTimezone: 'America/Sao_Paulo',
      sendingWindowConfig: DEFAULT_WINDOW_CONFIG,
    },
  })

  const inboxId = form.watch('inboxId')
  const messageValue = form.watch('messageContent') ?? ''
  const scheduledForValue = form.watch('scheduledFor')
  const windowEnabled = form.watch('sendingWindowEnabled')
  const templateName = form.watch('templateName')
  const templateLanguage = form.watch('templateLanguage')

  const selectedInbox = inboxes.find((inbox) => inbox.id === inboxId)
  const isMeta = selectedInbox?.connectionType === 'META_CLOUD'

  const selectedTemplate = useMemo(
    () =>
      templates.find(
        (template) =>
          template.name === templateName &&
          template.language === templateLanguage,
      ) ?? null,
    [templates, templateName, templateLanguage],
  )

  const bodyComponent = selectedTemplate?.components.find(
    (component) => component.type === 'BODY',
  )

  // Índices das variáveis {{N}} no corpo do template selecionado
  const bodyVariableIndices = useMemo(
    () =>
      bodyComponent?.text ? extractVariableIndices(bodyComponent.text) : [],
    [bodyComponent],
  )

  // Variáveis no cabeçalho de texto ainda não são suportadas no disparo (v1):
  // templateParams é uma lista única (corpo). Detectamos para bloquear o envio
  // e evitar um disparo que a Meta rejeitaria.
  const headerComponent = selectedTemplate?.components.find(
    (component) => component.type === 'HEADER' && component.format === 'TEXT',
  )
  const hasHeaderVariables = useMemo(
    () =>
      headerComponent?.text
        ? extractVariableIndices(headerComponent.text).length > 0
        : false,
    [headerComponent],
  )

  const { execute: fetchTemplates, isPending: isFetchingTemplates } = useAction(
    listWhatsAppTemplates,
    {
      onSuccess: ({ data }) => {
        setTemplates(
          (data ?? []).filter((template) => template.status === 'APPROVED'),
        )
      },
      onError: () => {
        setTemplates([])
        toast.error('Não foi possível carregar os templates desta caixa.')
      },
    },
  )

  const {
    execute: fetchSegmentCount,
    result: segmentCountResult,
    isPending: isCountingSegment,
  } = useAction(previewSegmentCount)

  const segmentCount = segmentCountResult.data?.count

  const handleSegmentChange = (value: string) => {
    setSegmentId(value)
    const segment = segments.find((item) => item.id === value)
    if (segment) {
      fetchSegmentCount(segment.filters)
    }
  }

  // Volta o formulário ao estado inicial (usado ao fechar o sheet ou após criar)
  const resetForm = () => {
    form.reset()
    setSelectedContacts([])
    setSegmentId('')
    setRecipientMode('manual')
    setTemplates([])
    setBodyValues([])
  }

  // Reseta ao fechar o sheet sem salvar — senão os dados ficam no próximo abrir
  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm()
    setIsOpen(open)
  }

  const { execute, isPending } = useAction(createBroadcast, {
    onSuccess: ({ data }) => {
      if (!data?.success) return
      const queued = data.totalRecipients - data.skippedCount
      const parts = [`${queued.toLocaleString('pt-BR')} na fila`]
      if (data.skippedCount > 0) parts.push(`${data.skippedCount} ignorado(s)`)
      if (data.notFoundCount > 0)
        parts.push(`${data.notFoundCount} não encontrado(s)`)
      toast.success(`Disparo criado — ${parts.join(', ')}.`)
      resetForm()
      setIsOpen(false)
      router.refresh()
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? 'Não foi possível criar o disparo.')
    },
  })

  const handleInboxChange = (value: string) => {
    form.setValue('inboxId', value)
    form.setValue('templateName', '')
    form.setValue('templateLanguage', '')
    setTemplates([])
    setBodyValues([])
    const inbox = inboxes.find((item) => item.id === value)
    if (inbox?.connectionType === 'META_CLOUD') {
      fetchTemplates({ inboxId: value })
    }
  }

  const handleTemplateChange = (value: string) => {
    const [name, language] = value.split('|')
    form.setValue('templateName', name)
    form.setValue('templateLanguage', language)
    // Reinicia os valores das variáveis dimensionando pelo maior índice {{N}}
    const template = templates.find(
      (item) => item.name === name && item.language === language,
    )
    const bodyText = template?.components.find(
      (component) => component.type === 'BODY',
    )?.text
    const indices = bodyText ? extractVariableIndices(bodyText) : []
    const size = indices.length ? Math.max(...indices) : 0
    setBodyValues(new Array(size).fill(''))
  }

  const onSubmit = (values: FormValues) => {
    const usingSegment = recipientMode === 'segment'
    if (usingSegment && !segmentId) {
      toast.error('Selecione um segmento.')
      return
    }
    if (!usingSegment && selectedContacts.length === 0) {
      toast.error('Selecione ao menos um contato.')
      return
    }
    if (isMeta && !values.templateName) {
      toast.error('Selecione um template aprovado.')
      return
    }
    if (isMeta && hasHeaderVariables) {
      toast.error(
        'Templates com variável no cabeçalho ainda não são suportados em disparos. Escolha outro template.',
      )
      return
    }
    if (isMeta) {
      const hasEmptyVariable = bodyVariableIndices.some(
        (index) => !bodyValues[index - 1]?.trim(),
      )
      if (hasEmptyVariable) {
        toast.error('Preencha todas as variáveis do template.')
        return
      }
    }
    if (!isMeta && !values.messageContent?.trim()) {
      form.setError('messageContent', { message: 'Escreva a mensagem.' })
      return
    }

    execute({
      inboxId: values.inboxId,
      name: values.name,
      contactIds: usingSegment
        ? undefined
        : selectedContacts.map((contact) => contact.id),
      segmentId: usingSegment ? segmentId : undefined,
      throttleMs: values.throttleMs,
      messageContent: isMeta ? undefined : values.messageContent,
      templateName: isMeta ? values.templateName : undefined,
      templateLanguage: isMeta ? values.templateLanguage : undefined,
      templateParams:
        isMeta && bodyVariableIndices.length > 0 ? bodyValues : undefined,
      scheduledFor: values.scheduledFor
        ? new Date(values.scheduledFor)
        : undefined,
      sendingWindowEnabled: values.sendingWindowEnabled,
      sendingWindowConfig: values.sendingWindowEnabled
        ? values.sendingWindowConfig
        : undefined,
      sendingWindowTimezone: values.sendingWindowTimezone,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Novo disparo</SheetTitle>
          <SheetDescription>
            Envie uma mensagem para vários contatos via WhatsApp.
          </SheetDescription>
        </SheetHeader>

        {inboxes.length === 0 ? (
          <div className="mt-6 space-y-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <p>Nenhum canal conectado para disparar.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/org/${orgSlug}/prospection/channels`}>
                Conectar canal
              </Link>
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-5"
            >
              <FormField
                control={form.control}
                name="inboxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Canal de origem *</FormLabel>
                    <Select
                      onValueChange={handleInboxChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o WhatsApp de envio" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {inboxes.map((inbox) => (
                          <SelectItem key={inbox.id} value={inbox.id}>
                            {inbox.name} ·{' '}
                            {getConnectionLabel(inbox.connectionType)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do disparo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex.: Black Friday — Leads frios"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Uso interno, só você e sua equipe veem.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <Label>Destinatários *</Label>
                <RadioGroup
                  value={recipientMode}
                  onValueChange={(value) =>
                    setRecipientMode(value as RecipientMode)
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  <Label
                    htmlFor="mode-manual"
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal [&:has([data-state=checked])]:border-primary/40 [&:has([data-state=checked])]:bg-primary/10"
                  >
                    <RadioGroupItem value="manual" id="mode-manual" />
                    Escolher manualmente
                  </Label>
                  <Label
                    htmlFor="mode-segment"
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal [&:has([data-state=checked])]:border-primary/40 [&:has([data-state=checked])]:bg-primary/10"
                  >
                    <RadioGroupItem value="segment" id="mode-segment" />
                    Filtrar por segmento
                  </Label>
                </RadioGroup>

                {recipientMode === 'manual' ? (
                  <>
                    <ContactMultiSelect
                      selected={selectedContacts}
                      onChange={setSelectedContacts}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">
                      Contatos sem telefone, anonimizados ou com opt-out são
                      ignorados automaticamente.
                    </p>
                  </>
                ) : segments.length === 0 ? (
                  <div className="space-y-2 rounded-md border border-dashed p-4 text-center text-[0.8rem] text-muted-foreground">
                    <p>Nenhum segmento criado ainda.</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/org/${orgSlug}/prospection/segments`}>
                        Criar segmento
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <>
                    <Select
                      value={segmentId}
                      onValueChange={handleSegmentChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um segmento" />
                      </SelectTrigger>
                      <SelectContent>
                        {segments.map((segment) => (
                          <SelectItem key={segment.id} value={segment.id}>
                            {segment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {segmentId && (
                      <div className="flex items-center gap-1.5 text-[0.8rem] text-muted-foreground">
                        <Users className="h-3.5 w-3.5" />
                        {isCountingSegment ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : segmentCount !== undefined ? (
                          <span>
                            <span className="font-semibold text-foreground">
                              {segmentCount.toLocaleString('pt-BR')}
                            </span>{' '}
                            contatos elegíveis no momento
                          </span>
                        ) : null}
                      </div>
                    )}
                    <p className="text-[0.8rem] text-muted-foreground">
                      O público é recalculado no envio. Contatos sem telefone,
                      anonimizados ou com opt-out são ignorados.
                    </p>
                  </>
                )}
              </div>

              {isMeta ? (
                <div className="space-y-2">
                  <Label>Template aprovado *</Label>
                  <Select
                    onValueChange={handleTemplateChange}
                    value={
                      templateName ? `${templateName}|${templateLanguage}` : ''
                    }
                    disabled={isFetchingTemplates}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          isFetchingTemplates
                            ? 'Carregando templates...'
                            : 'Selecione um template aprovado'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={`${template.name}|${template.language}`}
                        >
                          {template.name} ({template.language})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isFetchingTemplates && templates.length === 0 && (
                    <p className="text-[0.8rem] text-muted-foreground">
                      Nenhum template aprovado nesta caixa. Crie e aprove um
                      template na Meta antes de disparar.
                    </p>
                  )}
                  <p className="text-[0.8rem] text-muted-foreground">
                    A Meta exige template aprovado para mensagens fora da janela
                    de 24h (o caso de listas frias).
                  </p>

                  {selectedTemplate && hasHeaderVariables && (
                    <p className="text-[0.8rem] text-destructive">
                      Este template usa variável no cabeçalho, que ainda não é
                      suportada em disparos. Escolha um template sem variável no
                      cabeçalho.
                    </p>
                  )}

                  {selectedTemplate && (
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
                      {bodyVariableIndices.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Variáveis do corpo
                          </p>
                          {bodyVariableIndices.map((index) => (
                            <div key={`body-${index}`} className="space-y-1.5">
                              <Label className="text-xs">{`{{${index}}}`}</Label>
                              <Input
                                value={bodyValues[index - 1] ?? ''}
                                onChange={(event) => {
                                  const nextValue = event.target.value
                                  setBodyValues((previous) => {
                                    const updated = [...previous]
                                    updated[index - 1] = nextValue
                                    return updated
                                  })
                                }}
                                placeholder={`Valor para {{${index}}}`}
                                className="h-9"
                              />
                            </div>
                          ))}
                          <p className="text-[0.8rem] text-muted-foreground">
                            Os mesmos valores são usados para todos os contatos
                            deste disparo.
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Preview
                        </p>
                        <TemplatePreview
                          template={selectedTemplate}
                          bodyVariableValues={bodyValues}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FormField
                  control={form.control}
                  name="messageContent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mensagem *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Escreva a mensagem que será enviada..."
                          rows={6}
                          maxLength={MAX_MESSAGE_LENGTH}
                          {...field}
                        />
                      </FormControl>
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-muted-foreground">
                          {messageValue.length}/{MAX_MESSAGE_LENGTH}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="throttleMs"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Velocidade de envio</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {THROTTLE_PRESETS.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {preset.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Intervalos maiores reduzem o risco de bloqueio do número.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 rounded-lg border border-border/50 p-3">
                <FormField
                  control={form.control}
                  name="sendingWindowEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <div className="space-y-0.5">
                        <FormLabel>Restringir horários de envio</FormLabel>
                        <FormDescription>
                          Fora da janela, o disparo pausa e retoma sozinho na
                          próxima abertura.
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

                {windowEnabled && (
                  <div className="space-y-3 pt-1">
                    <FormField
                      control={form.control}
                      name="sendingWindowTimezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuso horário</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {WINDOW_TIMEZONES.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <Label>Dias e horários</Label>
                      <div className="rounded-md border border-border/50">
                        {WINDOW_DAYS.map((day) => {
                          const dayEnabled = form.watch(
                            `sendingWindowConfig.${day.key}.enabled`,
                          )
                          return (
                            <div
                              key={day.key}
                              className="flex items-center gap-3 border-b border-border/30 px-3 py-2 last:border-b-0"
                            >
                              <FormField
                                control={form.control}
                                name={`sendingWindowConfig.${day.key}.enabled`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <span className="w-10 text-sm font-medium">
                                {day.label}
                              </span>
                              <FormField
                                control={form.control}
                                name={`sendingWindowConfig.${day.key}.start`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        type="time"
                                        className="h-8 w-28"
                                        disabled={!dayEnabled}
                                        {...field}
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                              <span className="text-sm text-muted-foreground">
                                até
                              </span>
                              <FormField
                                control={form.control}
                                name={`sendingWindowConfig.${day.key}.end`}
                                render={({ field }) => (
                                  <FormItem className="space-y-0">
                                    <FormControl>
                                      <Input
                                        type="time"
                                        className="h-8 w-28"
                                        disabled={!dayEnabled}
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <FormField
                control={form.control}
                name="scheduledFor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agendar para</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      Deixe em branco para enviar imediatamente.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {scheduledForValue ? 'Agendar disparo' : 'Criar disparo'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  )
}
