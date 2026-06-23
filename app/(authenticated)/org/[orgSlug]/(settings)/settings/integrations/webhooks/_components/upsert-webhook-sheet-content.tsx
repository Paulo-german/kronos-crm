'use client'

import { useState, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Wand2,
  Loader2,
  ShieldCheck,
  ShieldOff,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'
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
import { Separator } from '@/_components/ui/separator'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { createWebhookSource } from '@/_actions/webhook-source/create-webhook-source'
import { updateWebhookSource } from '@/_actions/webhook-source/update-webhook-source'
import {
  createWebhookSourceSchema,
  type WebhookSourceDto,
} from '@/_actions/webhook-source/schema'
import { z } from 'zod'
import { FieldMappingEditor } from './field-mapping-editor'
import { PlatformLogo } from './platform-logo'
import { WebhookUrlDisplay } from './webhook-url-display'
import { WebhookPayloadTester } from './webhook-payload-tester'
import { WebhookFieldDetector } from './webhook-field-detector'
import {
  PLATFORM_LABELS,
  EVENT_TYPE_LABELS,
  PLATFORM_TEMPLATES,
  PLATFORM_HMAC_HINTS,
  type WebhookPlatform,
  type WebhookEventType,
} from '../_lib/platform-templates'
import type { SquadDto } from '@/_data-access/squad/get-squads'

// z.input<> captura o tipo PRE-defaults (platform opcional, isActive opcional)
// Evita conflito de tipos no zodResolver que espera o input type, não o output type
type CreateWebhookInput = z.input<typeof createWebhookSourceSchema>

interface UpsertWebhookSheetContentProps {
  source?: WebhookSourceDto
  squads: SquadDto[]
  onSuccess?: () => void
}

const PLATFORMS = Object.keys(PLATFORM_LABELS) as WebhookPlatform[]
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as WebhookEventType[]

function CreateWizardStepper({ step }: { step: 'step1' | 'step2' }) {
  return (
    <div className="mt-1 flex items-center gap-2">
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          step === 'step1'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        1. Configuração
      </span>
      <ArrowRight className="h-3 w-3 text-muted-foreground" />
      <span
        className={cn(
          'rounded-full px-2.5 py-0.5 text-xs font-medium',
          step === 'step2'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        2. Campos
      </span>
    </div>
  )
}

export function UpsertWebhookSheetContent({
  source,
  squads,
  onSuccess,
}: UpsertWebhookSheetContentProps) {
  const isEditing = !!source?.id
  const [step, setStep] = useState<'step1' | 'step2'>('step1')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [createdSourceId, setCreatedSourceId] = useState<string | null>(null)
  const [clearSecretKey, setClearSecretKey] = useState(false)
  const [wizardMapping, setWizardMapping] = useState<Record<string, string>>({})
  // controla o comportamento do executeUpdate dependendo do contexto de chamada:
  // 'edit' → atualiza e fecha | 'wizard' → salva mapping e fecha | 'wizard-back' → atualiza e volta ao step 2
  const updateContextRef = useRef<'edit' | 'wizard' | 'wizard-back'>('edit')

  const form = useForm<CreateWebhookInput>({
    resolver: zodResolver(createWebhookSourceSchema),
    defaultValues: isEditing
      ? {
          name: source.name,
          platform: source.platform as WebhookPlatform,
          eventType: source.eventType as WebhookEventType,
          fieldMapping: source.fieldMapping as Record<string, string>,
          isActive: source.isActive,
          squadId: source.squadId ?? null,
        }
      : {
          name: '',
          platform: 'GENERIC',
          eventType: 'UPSERT_CONTACT',
          fieldMapping: {},
          isActive: true,
          squadId: null,
        },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createWebhookSource,
    {
      onSuccess: ({ data }) => {
        if (data?.token && data?.id) {
          setCreatedToken(data.token)
          setCreatedSourceId(data.id)
          setStep('step2')
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao criar webhook.')
      },
    },
  )

  const { execute: executeUpdate, isPending: isUpdating } = useAction(
    updateWebhookSource,
    {
      onSuccess: () => {
        if (updateContextRef.current === 'wizard-back') {
          setStep('step2')
          return
        }
        toast.success(
          updateContextRef.current === 'wizard'
            ? 'Configuração salva com sucesso!'
            : 'Webhook atualizado com sucesso!',
        )
        onSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao salvar webhook.')
      },
    },
  )

  const isPending = isCreating || isUpdating

  const handleRemoveSecret = useCallback(() => {
    setClearSecretKey(true)
    form.setValue('secretKey', '')
  }, [form])

  const handleCancelRemoveSecret = useCallback(() => {
    setClearSecretKey(false)
    form.setValue('secretKey', '')
  }, [form])

  const onSubmit = (data: CreateWebhookInput) => {
    const mapping = data.fieldMapping as Record<string, string>
    const fieldMapping = Object.keys(mapping).length > 0 ? mapping : undefined

    if (isEditing && source?.id) {
      // Passa undefined quando vazio para que o update ignore o campo (fieldMapping é optional no server)
      // Evita falha no fieldMappingRequiredSchema quando o webhook ainda não tem mapeamento configurado
      executeUpdate({ id: source.id, ...data, fieldMapping, clearSecretKey })
    } else if (createdSourceId) {
      // voltou do step 2 para editar configuração básica — atualiza e retorna ao step 2
      updateContextRef.current = 'wizard-back'
      executeUpdate({ id: createdSourceId, ...data, fieldMapping })
    } else {
      executeCreate({ ...data, fieldMapping: {} })
    }
  }

  const handleSaveMapping = () => {
    if (!createdSourceId) return
    if (Object.keys(wizardMapping).length === 0) {
      toast.warning('Adicione pelo menos um campo mapeado antes de salvar.')
      return
    }
    updateContextRef.current = 'wizard'
    executeUpdate({ id: createdSourceId, fieldMapping: wizardMapping })
  }

  const watchedPlatform = form.watch('platform') as WebhookPlatform
  const watchedEventType = form.watch('eventType') as WebhookEventType
  const watchedFieldMapping = form.watch('fieldMapping') as Record<
    string,
    string
  >
  const showSquadField = watchedEventType === 'UPSERT_CONTACT'

  const template = PLATFORM_TEMPLATES[watchedPlatform]?.[watchedEventType]
  const hasTemplate =
    watchedPlatform !== 'GENERIC' &&
    watchedPlatform !== 'OTHER' &&
    template !== undefined &&
    Object.keys(template).length > 0

  const handleApplyTemplate = () => {
    if (!template) return
    form.setValue('fieldMapping', template as Record<string, string>)
    toast.info('Sugestão aplicada! Ajuste se necessário.')
  }

  // Modo CREATE step 2: mapeamento após criação do webhook
  if (!isEditing && step === 'step2' && createdToken && createdSourceId) {
    return (
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Novo Webhook</SheetTitle>
          <CreateWizardStepper step="step2" />
          <SheetDescription>
            Configure quais informações do sistema externo vão para cada campo
            do CRM.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Endereço de recebimento
          </label>
          <WebhookUrlDisplay token={createdToken} />
          <p className="text-xs text-muted-foreground">
            Copie este endereço no sistema externo e faça um envio de teste para
            detectar os campos automaticamente.
          </p>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Campos recebidos</p>
              <p className="text-xs text-muted-foreground">
                Defina quais informações do sistema externo vão para cada campo
                do CRM.
              </p>
            </div>
            {hasTemplate && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setWizardMapping(template as Record<string, string>)
                  toast.info('Sugestão aplicada! Ajuste se necessário.')
                }}
                className="shrink-0 gap-1.5"
              >
                <Wand2 className="h-3.5 w-3.5" />
                Usar template
              </Button>
            )}
          </div>

          <WebhookFieldDetector
            webhookSourceId={createdSourceId}
            token={createdToken}
            onApply={(mapping) => setWizardMapping(mapping)}
          />

          <FieldMappingEditor
            value={wizardMapping}
            onChange={setWizardMapping}
          />
        </div>

        {Object.keys(wizardMapping).length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-sm font-medium">Testar configuração</p>
              <WebhookPayloadTester fieldMapping={wizardMapping} />
            </div>
          </>
        )}

        <div className="flex justify-between gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={isUpdating}
            onClick={() => setStep('step1')}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isUpdating}
              onClick={() => onSuccess?.()}
            >
              Pular por agora
            </Button>
            <Button
              type="button"
              disabled={isUpdating}
              onClick={handleSaveMapping}
            >
              {isUpdating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : (
                'Salvar configuração'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    )
  }

  return (
    <SheetContent className="flex flex-col overflow-y-auto sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>{isEditing ? 'Editar Webhook' : 'Novo Webhook'}</SheetTitle>
        {!isEditing && <CreateWizardStepper step="step1" />}
        <SheetDescription>
          {isEditing
            ? 'Atualize as configurações deste webhook.'
            : 'Configure um endereço para receber informações de outros sistemas.'}
        </SheetDescription>
      </SheetHeader>

      {/* URL do webhook em edição */}
      {isEditing && source && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Endereço de recebimento
          </label>
          <WebhookUrlDisplay token={source.token} />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Shopify - Novos pedidos" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plataforma</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a plataforma" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PLATFORMS.map((platform) => (
                        <SelectItem key={platform} value={platform}>
                          <span className="flex items-center gap-2">
                            <PlatformLogo platform={platform} />
                            {PLATFORM_LABELS[platform]}
                          </span>
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
              name="eventType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de evento</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o evento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EVENT_TYPES.map((eventType) => (
                        <SelectItem key={eventType} value={eventType}>
                          {EVENT_TYPE_LABELS[eventType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showSquadField && (
            <FormField
              control={form.control}
              name="squadId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time responsável</FormLabel>
                  <Select
                    value={field.value ?? 'default'}
                    onValueChange={(value) =>
                      field.onChange(value === 'default' ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar time..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="default">
                        Time padrão da organização
                      </SelectItem>
                      {squads.map((squad) => (
                        <SelectItem key={squad.id} value={squad.id}>
                          {squad.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Define qual time receberá os leads deste webhook. Sem
                    seleção, usa o time padrão.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Mapeamento de campos — exibido apenas no modo EDIT */}
          {isEditing && (
            <>
              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Mapeamento de campos</p>
                    <p className="text-xs text-muted-foreground">
                      Mapeie os campos do payload externo para os campos do CRM.
                    </p>
                  </div>
                  {hasTemplate && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleApplyTemplate}
                      className="shrink-0 gap-1.5"
                    >
                      <Wand2 className="h-3.5 w-3.5" />
                      Usar template
                    </Button>
                  )}
                </div>

                {source && (
                  <WebhookFieldDetector
                    webhookSourceId={source.id}
                    token={source.token}
                    onApply={(mapping) =>
                      form.setValue('fieldMapping', mapping)
                    }
                  />
                )}

                <FormField
                  control={form.control}
                  name="fieldMapping"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <FieldMappingEditor
                          value={field.value as Record<string, string>}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {Object.keys(watchedFieldMapping).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Testar configuração</p>
                    <WebhookPayloadTester fieldMapping={watchedFieldMapping} />
                  </div>
                </>
              )}
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Verificação de segurança</p>
              <p className="text-xs text-muted-foreground">
                Opcional. Adicione uma chave para confirmar que os dados vêm do
                sistema correto.
              </p>
            </div>

            {isEditing && source?.hasSecretKey && !clearSecretKey && (
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Chave de segurança configurada
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={handleRemoveSecret}
                >
                  <ShieldOff className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </div>
            )}

            {clearSecretKey && (
              <div className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <ShieldOff className="h-4 w-4" />
                  Chave de segurança será removida ao salvar
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={handleCancelRemoveSecret}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {(!isEditing || !source?.hasSecretKey || clearSecretKey) && (
              <FormField
                control={form.control}
                name="secretKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditing && source?.hasSecretKey
                        ? 'Nova chave'
                        : 'Chave de segurança'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder={
                          clearSecretKey
                            ? 'Deixe vazio para remover, ou digite para substituir'
                            : isEditing && source?.hasSecretKey
                              ? 'Deixe vazio para manter a atual'
                              : 'Mínimo 8 caracteres'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(!isEditing || !source?.hasSecretKey || clearSecretKey) &&
              (PLATFORM_HMAC_HINTS[watchedPlatform] ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  {PLATFORM_HMAC_HINTS[watchedPlatform]}
                </Badge>
              ) : watchedPlatform === 'GOOGLE_FORMS' ? (
                <p className="text-xs text-muted-foreground">
                  Google Forms não suporta verificação de segurança.
                </p>
              ) : null)}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => onSuccess?.()}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </span>
              ) : isEditing ? (
                'Salvar alterações'
              ) : (
                <span className="flex items-center gap-2">
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}
