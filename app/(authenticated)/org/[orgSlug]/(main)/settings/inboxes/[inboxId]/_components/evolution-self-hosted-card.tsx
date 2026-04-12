'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
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
import { Badge } from '@/_components/ui/badge'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { saveEvolutionSelfHosted } from '@/_actions/inbox/save-evolution-self-hosted'
import { removeEvolutionSelfHosted } from '@/_actions/inbox/remove-evolution-self-hosted'
import { testEvolutionConnection } from '@/_actions/inbox/test-evolution-connection'

const selfHostedFormSchema = z.object({
  evolutionApiUrl: z
    .string()
    .trim()
    .url('URL inválida')
    .refine(
      (url) => url.startsWith('https://') || url.startsWith('http://'),
      'URL deve começar com http:// ou https://',
    )
    .refine(
      (url) => !url.endsWith('/'),
      'URL não deve terminar com barra',
    ),
  evolutionInstanceName: z
    .string()
    .trim()
    .min(1, 'Nome da instância obrigatório')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Use apenas letras, números, hífens e underscores',
    ),
  // API Key pode ser vazia ao editar (mantém a existente)
  evolutionApiKey: z.string().trim(),
})

type SelfHostedFormValues = z.infer<typeof selfHostedFormSchema>

interface EvolutionSelfHostedCardProps {
  inboxId: string
  canManage: boolean
  // Campos já salvos (opcionais — null se ainda não configurado)
  savedApiUrl: string | null
  savedInstanceName: string | null
  savedApiKeyMasked: string | null
  webhookSecret: string | null
  onRemoved?: () => void
}

const buildWebhookUrl = (webhookSecret: string): string => {
  const appUrl = 'https://app.kronoshub.com.br'
  return `${appUrl}/api/webhooks/evolution?secret=${webhookSecret}`
}

const maskApiKey = (key: string): string => {
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`
}

const EvolutionSelfHostedCard = ({
  inboxId,
  canManage,
  savedApiUrl,
  savedInstanceName,
  savedApiKeyMasked,
  webhookSecret,
  onRemoved,
}: EvolutionSelfHostedCardProps) => {
  const isAlreadySaved = !!savedApiUrl && !!savedInstanceName
  const [showApiKey, setShowApiKey] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)

  // Quando as credenciais já estão salvas, exibimos os campos em modo somente leitura
  // e oferecemos a opção de editar (resetar para o modo formulário)
  const [isEditing, setIsEditing] = useState(!isAlreadySaved)

  const form = useForm<SelfHostedFormValues>({
    resolver: zodResolver(selfHostedFormSchema),
    defaultValues: {
      evolutionApiUrl: savedApiUrl ?? '',
      evolutionInstanceName: savedInstanceName ?? '',
      evolutionApiKey: '',
    },
  })

  const { execute: executeSave, isPending: isSaving } = useAction(
    saveEvolutionSelfHosted,
    {
      onSuccess: () => {
        toast.success('Credenciais Evolution API salvas com sucesso!')
        setIsEditing(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao salvar credenciais.')
      },
    },
  )

  const { execute: executeRemove, isPending: isRemoving } = useAction(
    removeEvolutionSelfHosted,
    {
      onSuccess: () => {
        toast.success('Configuração self-hosted removida. Usando WhatsApp padrão.')
        setIsRemoveOpen(false)
        onRemoved?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao remover configuração.')
      },
    },
  )

  const { execute: executeTest, isPending: isTesting } = useAction(
    testEvolutionConnection,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          const stateLabel =
            data.state === 'open'
              ? 'Conectada ao WhatsApp'
              : data.state === 'connecting'
                ? 'Aguardando QR / pareamento'
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

  const handleSubmit = (values: SelfHostedFormValues) => {
    // Na criação, API Key é obrigatória
    if (!isAlreadySaved && !values.evolutionApiKey) {
      form.setError('evolutionApiKey', { message: 'API Key obrigatória' })
      return
    }
    executeSave({
      inboxId,
      evolutionApiUrl: values.evolutionApiUrl,
      evolutionInstanceName: values.evolutionInstanceName,
      // Se vazio ao editar, o backend mantém a key existente
      evolutionApiKey: values.evolutionApiKey || '',
    })
  }

  const handleCopyWebhook = async () => {
    if (!webhookSecret) return
    const url = buildWebhookUrl(webhookSecret)
    await navigator.clipboard.writeText(url)
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  const handleTestConnection = () => {
    executeTest({ inboxId })
  }

  return (
    <>
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Server className="h-5 w-5" />
              Evolution API
            </CardTitle>
            <Badge
              variant="outline"
              className="gap-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            >
              <Server className="h-3 w-3" />
              Evolution API
            </Badge>
          </div>
          <CardDescription>
            Configure sua instância Evolution API self-hosted para este inbox.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Modo somente leitura — credenciais já salvas */}
          {isAlreadySaved && !isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  URL da API
                </p>
                <p className="rounded-md border border-border/50 bg-background/70 px-3 py-2 text-sm font-mono break-all">
                  {savedApiUrl}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Instância
                  </p>
                  <p className="rounded-md border border-border/50 bg-background/70 px-3 py-2 text-sm font-mono break-all">
                    {savedInstanceName}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    API Key
                  </p>
                  <p className="rounded-md border border-border/50 bg-background/70 px-3 py-2 text-sm font-mono">
                    {maskApiKey(savedApiKeyMasked ?? '••••••••')}
                  </p>
                </div>
              </div>

              {/* Botões de ação no modo somente leitura */}
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestConnection}
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
                  name="evolutionApiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da API</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://evolution.exemplo.com"
                          disabled={!canManage || isSaving}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="evolutionInstanceName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da instância</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ex: outbound-7"
                            disabled={!canManage || isSaving}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="evolutionApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              placeholder={
                                isAlreadySaved
                                  ? 'Nova API Key (deixe vazio para manter)'
                                  : 'API Key da instância'
                              }
                              disabled={!canManage || isSaving}
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                              onClick={() => setShowApiKey((prev) => !prev)}
                              tabIndex={-1}
                            >
                              {showApiKey ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="submit"
                      disabled={isSaving}
                    >
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
                            evolutionApiUrl: savedApiUrl ?? '',
                            evolutionInstanceName: savedInstanceName ?? '',
                            evolutionApiKey: '',
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
          {webhookSecret && (
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Configure o webhook na sua instância Evolution
                </p>
                <p className="text-xs text-muted-foreground">
                  Copie a URL abaixo e configure como webhook na sua instância
                  Evolution API. O Kronos usará esta URL para receber mensagens.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded border border-border/50 bg-background/70 px-3 py-2 text-xs font-mono break-all">
                    {buildWebhookUrl(webhookSecret)}
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
              </AlertDescription>
            </Alert>
          )}

          {/* Botão para reverter para WhatsApp padrão */}
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
                Usar WhatsApp padrão
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Remove as credenciais self-hosted e volta a usar a instância
                gerenciada pela Kronos.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isRemoveOpen}
        onOpenChange={setIsRemoveOpen}
        title="Usar WhatsApp padrão?"
        description={
          <p>
            As credenciais da sua instância Evolution API serão removidas. Este
            inbox voltará a usar a instância WhatsApp gerenciada pela Kronos.
            <br />
            <span className="text-muted-foreground">
              A sua instância Evolution não será afetada.
            </span>
          </p>
        }
        icon={<RotateCcw />}
        variant="default"
        onConfirm={() => executeRemove({ inboxId })}
        isLoading={isRemoving}
        confirmLabel="Confirmar"
      />
    </>
  )
}

export default EvolutionSelfHostedCard
