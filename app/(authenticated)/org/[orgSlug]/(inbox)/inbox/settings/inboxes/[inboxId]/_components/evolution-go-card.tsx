'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  Server,
  Copy,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Info,
  RotateCcw,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { getInboxWebhookUrl } from '@/_actions/inbox/get-inbox-webhook-url'
import { saveEvolutionGoCredentials } from '@/_actions/inbox/save-evolution-go-credentials'
import { removeEvolutionGoCredentials } from '@/_actions/inbox/remove-evolution-go-credentials'
import { testEvolutionGoConnection } from '@/_actions/inbox/test-evolution-go-connection'

const goFormSchema = z.object({
  apiUrl: z
    .string()
    .trim()
    .url('URL inválida')
    .refine(
      (url) => url.startsWith('https://') || url.startsWith('http://'),
      'URL deve começar com http:// ou https://',
    )
    .refine((url) => !url.endsWith('/'), 'URL não deve terminar com barra'),
  instanceName: z
    .string()
    .trim()
    .min(1, 'Nome da instância obrigatório')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Use apenas letras, números, hífens e underscores',
    ),
  apiToken: z.string().trim(),
})

type GoFormValues = z.infer<typeof goFormSchema>

interface EvolutionGoCardProps {
  inboxId: string
  canManage: boolean
  savedApiUrl: string | null
  savedInstanceName: string | null
  savedApiTokenMasked: string | null
  hasWebhookSecret: boolean
  onRemoved?: () => void
}

const EvolutionGoCard = ({
  inboxId,
  canManage,
  savedApiUrl,
  savedInstanceName,
  savedApiTokenMasked,
  hasWebhookSecret,
  onRemoved,
}: EvolutionGoCardProps) => {
  const isAlreadySaved = !!savedApiUrl && !!savedInstanceName
  const [showToken, setShowToken] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(!isAlreadySaved)
  // URL do webhook (contém o secret) só chega ao client sob demanda, via action
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)

  const form = useForm<GoFormValues>({
    resolver: zodResolver(goFormSchema),
    defaultValues: {
      apiUrl: savedApiUrl ?? '',
      instanceName: savedInstanceName ?? '',
      apiToken: '',
    },
  })

  const { execute: executeSave, isPending: isSaving } = useAction(
    saveEvolutionGoCredentials,
    {
      onSuccess: () => {
        toast.success('Credenciais Evolution Go salvas com sucesso!')
        setIsEditing(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao salvar credenciais.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeEvolutionGoCredentials,
    {
      onSuccess: () => {
        toast.success('Configuração Evolution Go removida.')
        setIsRemoveOpen(false)
        onRemoved?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover configuração.')
      },
    },
  )

  const { execute: executeGetWebhookUrl, isPending: isLoadingWebhookUrl } =
    useAction(getInboxWebhookUrl, {
      onSuccess: ({ data }) => {
        setWebhookUrl(data?.webhookUrl ?? null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao buscar URL do webhook.')
      },
    })

  const { execute: executeTest, isPending: isTesting } = useAction(
    testEvolutionGoConnection,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          const stateLabel =
            data.state === 'open'
              ? 'Conectada ao WhatsApp'
              : data.state === 'connecting'
                ? 'Aguardando pareamento'
                : 'Desconectada'
          toast.success(`Conexão bem-sucedida! Estado: ${stateLabel}.`)
        } else {
          toast.error(data?.error || 'Falha ao testar conexão.')
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao testar conexão.')
      },
    },
  )

  const handleSubmit = (values: GoFormValues) => {
    if (!isAlreadySaved && !values.apiToken) {
      form.setError('apiToken', { message: 'Token obrigatório' })
      return
    }
    executeSave({
      inboxId,
      apiUrl: values.apiUrl,
      instanceName: values.instanceName,
      apiToken: values.apiToken || '',
    })
  }

  const handleCopyWebhook = async () => {
    if (!webhookUrl) return
    await navigator.clipboard.writeText(webhookUrl)
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  return (
    <>
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/images/providers/evolution-go.png"
                  alt="Evolution Go"
                  fill
                  className="rounded-md object-contain"
                  sizes="32px"
                />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Evolution Go
                </CardTitle>
                <CardDescription>Self-hosted (Go)</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Modo somente leitura — credenciais já salvas */}
          {isAlreadySaved && !isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  URL do servidor
                </p>
                <p className="break-all rounded-md border border-border/50 bg-background/70 px-3 py-2 font-mono text-sm">
                  {savedApiUrl}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Instância
                  </p>
                  <p className="break-all rounded-md border border-border/50 bg-background/70 px-3 py-2 font-mono text-sm">
                    {savedInstanceName}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Token
                  </p>
                  <p className="rounded-md border border-border/50 bg-background/70 px-3 py-2 font-mono text-sm">
                    {savedApiTokenMasked ?? '••••••••'}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeTest({ inboxId })}
                    disabled={isTesting}
                  >
                    {isTesting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Server className="mr-2 h-4 w-4" />
                    )}
                    Testar Conexão
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    type="button"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Alterar Credenciais
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Modo formulário — inserir/editar credenciais */
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL base da API</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://evolution.seudominio.com.br"
                          disabled={!canManage || isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL raiz do servidor Evolution Go, sem barra no final
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="instanceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome exato da instância</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ex: outbound_1"
                            disabled={!canManage || isSaving}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Exatamente como aparece no painel do Evolution Go
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="apiToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Token da instância</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showToken ? 'text' : 'password'}
                              placeholder={
                                isAlreadySaved
                                  ? 'Novo token (deixe vazio para manter)'
                                  : 'Token configurado na instância'
                              }
                              disabled={!canManage || isSaving}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                              onClick={() => setShowToken((prev) => !prev)}
                              tabIndex={-1}
                            >
                              {showToken ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Token definido na própria instância, não a chave
                          global do servidor
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Server className="mr-2 h-4 w-4" />
                      )}
                      Salvar Credenciais
                    </Button>

                    {isAlreadySaved && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          form.reset({
                            apiUrl: savedApiUrl ?? '',
                            instanceName: savedInstanceName ?? '',
                            apiToken: '',
                          })
                          setIsEditing(false)
                        }}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </form>
            </Form>
          )}

          {/* URL do Webhook — exibida apenas quando credenciais já foram salvas */}
          {hasWebhookSecret && (
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Configure o webhook na sua instância Evolution Go
                </p>
                <p className="text-xs text-muted-foreground">
                  Configure a URL abaixo como webhook no seu servidor Evolution
                  Go. O Kronos usará esta URL para receber mensagens.
                </p>
                {webhookUrl ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-x-auto break-all rounded border border-border/50 bg-background/70 px-3 py-2 font-mono text-xs">
                      {webhookUrl}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleCopyWebhook}
                      type="button"
                      title="Copiar URL do webhook"
                    >
                      {webhookCopied ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => executeGetWebhookUrl({ inboxId })}
                    disabled={isLoadingWebhookUrl}
                    type="button"
                  >
                    {isLoadingWebhookUrl ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    Mostrar URL do webhook
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Remover configuração */}
          {canManage && isAlreadySaved && (
            <div className="border-t border-border/50 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsRemoveOpen(true)}
                type="button"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Remover configuração
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Remove as credenciais salvas. Sua instância no servidor
                Evolution Go não será afetada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isRemoveOpen}
        onOpenChange={setIsRemoveOpen}
        title="Remover configuração Evolution Go?"
        description={
          <p>
            As credenciais salvas serão removidas do Kronos.
            <br />
            <span className="text-muted-foreground">
              Sua instância no servidor Evolution Go não será afetada.
            </span>
          </p>
        }
        icon={<RotateCcw />}
        variant="default"
        onConfirm={() => executeRemove({ inboxId })}
        isLoading={isRemoving}
        confirmLabel="Remover"
      />
    </>
  )
}

export default EvolutionGoCard
