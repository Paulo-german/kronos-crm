'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Wand2, Loader2, ShieldCheck, ShieldOff } from 'lucide-react'
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
import { createWebhookSource } from '@/_actions/webhook-source/create-webhook-source'
import { updateWebhookSource } from '@/_actions/webhook-source/update-webhook-source'
import {
  createWebhookSourceSchema,
  type WebhookSourceDto,
} from '@/_actions/webhook-source/schema'
import { z } from 'zod'
import { FieldMappingEditor } from './field-mapping-editor'
import { WebhookUrlDisplay } from './webhook-url-display'
import { WebhookPayloadTester } from './webhook-payload-tester'
import {
  PLATFORM_LABELS,
  EVENT_TYPE_LABELS,
  PLATFORM_TEMPLATES,
  PLATFORM_HMAC_HINTS,
  type WebhookPlatform,
  type WebhookEventType,
} from '../_lib/platform-templates'

// z.input<> captura o tipo PRE-defaults (platform opcional, isActive opcional)
// Evita conflito de tipos no zodResolver que espera o input type, não o output type
type CreateWebhookInput = z.input<typeof createWebhookSourceSchema>

interface UpsertWebhookSheetContentProps {
  source?: WebhookSourceDto
  onSuccess?: () => void
}

const PLATFORMS = Object.keys(PLATFORM_LABELS) as WebhookPlatform[]
const EVENT_TYPES = Object.keys(EVENT_TYPE_LABELS) as WebhookEventType[]

export function UpsertWebhookSheetContent({
  source,
  onSuccess,
}: UpsertWebhookSheetContentProps) {
  const isEditing = !!source?.id
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [clearSecretKey, setClearSecretKey] = useState(false)

  const form = useForm<CreateWebhookInput>({
    resolver: zodResolver(createWebhookSourceSchema),
    defaultValues: isEditing
      ? {
          name: source.name,
          platform: source.platform as WebhookPlatform,
          eventType: source.eventType as WebhookEventType,
          fieldMapping: source.fieldMapping as Record<string, string>,
          isActive: source.isActive,
        }
      : {
          name: '',
          platform: 'GENERIC',
          eventType: 'NEW_CONTACT',
          fieldMapping: {},
          isActive: true,
        },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createWebhookSource,
    {
      onSuccess: ({ data }) => {
        if (data?.token) {
          setCreatedToken(data.token)
        }
        toast.success('Webhook criado! Copie a URL abaixo antes de fechar.')
        // Não fecha automaticamente: usuário precisa copiar a URL gerada
        // form.reset() omitido — sheet fecha ao clicar em "Fechar" via onSuccess()
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
        toast.success('Webhook atualizado com sucesso!')
        onSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao atualizar webhook.')
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
    if (isEditing && source?.id) {
      executeUpdate({ id: source.id, ...data, clearSecretKey })
    } else {
      executeCreate(data)
    }
  }

  const watchedPlatform = form.watch('platform') as WebhookPlatform
  const watchedEventType = form.watch('eventType') as WebhookEventType
  const watchedFieldMapping = form.watch('fieldMapping') as Record<string, string>

  const template = PLATFORM_TEMPLATES[watchedPlatform]?.[watchedEventType]
  const hasTemplate =
    watchedPlatform !== 'GENERIC' &&
    watchedPlatform !== 'OTHER' &&
    template !== undefined &&
    Object.keys(template).length > 0

  const handleApplyTemplate = () => {
    if (!template) return
    form.setValue('fieldMapping', template as Record<string, string>)
    toast.info('Template aplicado! Ajuste os caminhos se necessário.')
  }

  return (
    <SheetContent className="flex flex-col overflow-y-auto sm:max-w-2xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Webhook' : 'Novo Webhook'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as configurações do endpoint de webhook.'
            : 'Configure um endpoint para receber dados de sistemas externos.'}
        </SheetDescription>
      </SheetHeader>

      {/* URL gerada após criação — oculta o formulário até o usuário fechar */}
      {createdToken ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 space-y-3">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            Webhook criado! Copie a URL abaixo e configure no sistema externo.
          </p>
          <WebhookUrlDisplay token={createdToken} />
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSuccess?.()}
            >
              Fechar
            </Button>
          </div>
        </div>
      ) : (
      <>
      {/* URL do webhook em edição */}
      {isEditing && source && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            URL do endpoint
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
                          {PLATFORM_LABELS[platform]}
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
                  className="gap-1.5 shrink-0"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  Usar template
                </Button>
              )}
            </div>

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
                <p className="text-sm font-medium">Testar mapeamento</p>
                <WebhookPayloadTester fieldMapping={watchedFieldMapping} />
              </div>
            </>
          )}

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Assinatura HMAC</p>
              <p className="text-xs text-muted-foreground">
                Opcional. Configure um secret para validar a origem dos eventos.
              </p>
            </div>

            {isEditing && source?.hasSecretKey && !clearSecretKey && (
              <div className="flex items-center justify-between rounded-md border border-border/50 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                  Secret configurada
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
                  Secret será removida ao salvar
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
                      {isEditing && source?.hasSecretKey ? 'Nova secret' : 'Secret'}
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

            {(!isEditing || !source?.hasSecretKey || clearSecretKey) && (
              PLATFORM_HMAC_HINTS[watchedPlatform] ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  {PLATFORM_HMAC_HINTS[watchedPlatform]}
                </Badge>
              ) : watchedPlatform === 'GOOGLE_FORMS' ? (
                <p className="text-xs text-muted-foreground">
                  Google Forms não suporta assinatura — não configure um secret.
                </p>
              ) : null
            )}
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
                'Criar webhook'
              )}
            </Button>
          </div>
        </form>
      </Form>
      </>
      )}
    </SheetContent>
  )
}
