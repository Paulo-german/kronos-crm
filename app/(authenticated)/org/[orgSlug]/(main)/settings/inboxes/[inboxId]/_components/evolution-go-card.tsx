'use client'

import { useState, useEffect, useRef } from 'react'
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
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
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
import { connectEvolutionGoInbox } from '@/_actions/inbox/connect-evolution-go-inbox'
import { getEvolutionGoQr } from '@/_actions/inbox/get-evolution-go-qr'
import { syncEvolutionGoStatus } from '@/_actions/inbox/sync-evolution-go-status'
import { disconnectEvolutionGoInbox } from '@/_actions/inbox/disconnect-evolution-go-inbox'

const QR_POLLING_INTERVAL_MS = 5_000

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
  apiToken: z.string().trim().min(1, 'Token obrigatório'),
})

type GoFormValues = z.infer<typeof goFormSchema>

interface EvolutionGoCardProps {
  inboxId: string
  canManage: boolean
  /** URL da API salva (null se ainda não configurado) */
  savedApiUrl: string | null
  /** Nome da instância gerada no connect (null se não conectado ainda) */
  savedInstanceName: string | null
  /** Token mascarado — apenas para indicar que há um token salvo */
  savedApiTokenMasked: string | null
  /** Secret do webhook per-inbox (null se não conectado) */
  webhookSecret: string | null
  /** Estado de conexão persistido */
  initialConnected: boolean
}

const PRODUCTION_URL = 'https://app.kronoshub.com.br'

const buildGoWebhookUrl = (webhookSecret: string): string => {
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : PRODUCTION_URL
  return `${appUrl}/api/webhooks/evolution-go?secret=${webhookSecret}`
}

const maskToken = (token: string): string => {
  if (token.length <= 8) return '••••••••'
  return `${token.slice(0, 4)}${'•'.repeat(token.length - 8)}${token.slice(-4)}`
}

const EvolutionGoCard = ({
  inboxId,
  canManage,
  savedApiUrl,
  savedInstanceName,
  savedApiTokenMasked,
  webhookSecret,
  initialConnected,
}: EvolutionGoCardProps) => {
  const isAlreadyConnected = !!savedApiUrl && !!savedInstanceName

  const [showToken, setShowToken] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(!isAlreadyConnected)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)

  // QR code retornado pelo connect ou pelo getQr
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  // Estado de conexão sincronizado com o polling
  const [isConnected, setIsConnected] = useState(initialConnected)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const form = useForm<GoFormValues>({
    resolver: zodResolver(goFormSchema),
    defaultValues: {
      apiUrl: savedApiUrl ?? '',
      apiToken: '',
    },
  })

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectEvolutionGoInbox,
    {
      onSuccess: ({ data }) => {
        toast.success('Instância Evolution Go criada! Escaneie o QR Code.')
        setIsEditing(false)
        if (data?.qrBase64) {
          setQrBase64(data.qrBase64)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao conectar instância Evolution Go.')
      },
    },
  )

  const { execute: executeGetQr, isPending: isLoadingQr } = useAction(
    getEvolutionGoQr,
    {
      onSuccess: ({ data }) => {
        if (data?.base64) {
          setQrBase64(data.base64)
          setIsConnected(false)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao obter QR Code.')
      },
    },
  )

  const { execute: executeSync } = useAction(syncEvolutionGoStatus, {
    onSuccess: ({ data }) => {
      if (data?.connected) {
        setIsConnected(true)
        setQrBase64(null)
      }
    },
  })

  const { execute: executeDisconnect, isPending: isDisconnecting } = useAction(
    disconnectEvolutionGoInbox,
    {
      onSuccess: () => {
        toast.success('Instância desconectada.')
        setIsConnected(false)
        setIsDisconnectOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? 'Erro ao desconectar.')
      },
    },
  )

  // Polling de status enquanto há QR exibido e ainda não conectado
  // useEffect permitido aqui: sincronização com sistema externo (Evolution Go)
  // Nota: savedInstanceName pode ser null logo após o primeiro connect (antes do reload),
  // mas syncEvolutionGoStatus resolve a instância pelo inboxId — não precisa do nome local.
  useEffect(() => {
    if (!isAlreadyConnected && !qrBase64) return
    if (isConnected) return

    pollingRef.current = setInterval(() => {
      executeSync({ inboxId })
    }, QR_POLLING_INTERVAL_MS)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [isConnected, qrBase64, isAlreadyConnected, inboxId, executeSync])

  const handleSubmit = (values: GoFormValues) => {
    executeConnect({
      inboxId,
      apiUrl: values.apiUrl,
      apiToken: values.apiToken,
    })
  }

  const handleCopyWebhook = async () => {
    if (!webhookSecret) return
    const url = buildGoWebhookUrl(webhookSecret)
    await navigator.clipboard.writeText(url)
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
  }

  const handleReconnect = () => {
    executeGetQr({ inboxId })
  }

  return (
    <>
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Server className="h-5 w-5" />
              Evolution Go (selfhosted)
            </CardTitle>
            <Badge
              variant="outline"
              className={
                isConnected
                  ? 'gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600'
                  : 'gap-1.5 border-border/50 bg-secondary/40 text-muted-foreground'
              }
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
          <CardDescription>
            Configure sua instância Evolution Go self-hosted para este inbox.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Modo somente leitura — instância já configurada */}
          {isAlreadyConnected && !isEditing ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  URL do servidor
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
                    Token
                  </p>
                  <p className="rounded-md border border-border/50 bg-background/70 px-3 py-2 text-sm font-mono">
                    {maskToken(savedApiTokenMasked ?? '••••••••')}
                  </p>
                </div>
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReconnect}
                    disabled={isLoadingQr}
                    type="button"
                  >
                    {isLoadingQr ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="mr-2 h-4 w-4" />
                    )}
                    Obter QR Code
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
                      <FormLabel>URL do servidor</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://seu-servidor.com"
                          disabled={!canManage || isConnecting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apiToken"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token de autenticação</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showToken ? 'text' : 'password'}
                            placeholder="Token de autenticação do servidor"
                            disabled={!canManage || isConnecting}
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
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canManage && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={isConnecting}>
                      {isConnecting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Server className="mr-2 h-4 w-4" />
                      )}
                      Conectar Instância
                    </Button>

                    {isAlreadyConnected && (
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => {
                          form.reset({
                            apiUrl: savedApiUrl ?? '',
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

          {/* QR Code — exibido após connect ou após obter QR */}
          {qrBase64 && !isConnected && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aguardando leitura do QR Code...
                </p>
              </div>
              <div className="flex justify-center rounded-lg border border-border/50 bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${qrBase64}`}
                  alt="QR Code para conexão WhatsApp"
                  className="h-52 w-52 object-contain"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Abra o WhatsApp no celular → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
          )}

          {/* Confirmação de conexão bem-sucedida */}
          {isConnected && isAlreadyConnected && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <Wifi className="h-4 w-4 text-emerald-600" />
              <p className="text-sm text-emerald-700">
                WhatsApp conectado com sucesso.
              </p>
            </div>
          )}

          {/* URL do Webhook — apenas quando credenciais salvas */}
          {webhookSecret && (
            <Alert className="border-blue-500/20 bg-blue-500/5">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Configure o webhook na sua instância Evolution Go
                </p>
                <p className="text-xs text-muted-foreground">
                  Copie a URL abaixo e configure como webhook no seu servidor
                  Evolution Go. O Kronos usará esta URL para receber mensagens.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded border border-border/50 bg-background/70 px-3 py-2 text-xs font-mono break-all">
                    {buildGoWebhookUrl(webhookSecret)}
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

          {/* Botão desconectar */}
          {canManage && isAlreadyConnected && isConnected && (
            <div className="border-t border-border/50 pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setIsDisconnectOpen(true)}
                type="button"
              >
                <WifiOff className="mr-2 h-4 w-4" />
                Desconectar instância
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                Marca a instância como desconectada localmente. A instância no
                servidor Evolution Go não é afetada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isDisconnectOpen}
        onOpenChange={setIsDisconnectOpen}
        title="Desconectar instância?"
        description={
          <p>
            A instância será marcada como desconectada no Kronos.
            <br />
            <span className="text-muted-foreground">
              Sua instância no servidor Evolution Go não será removida.
            </span>
          </p>
        }
        icon={<WifiOff />}
        variant="default"
        onConfirm={() => executeDisconnect({ inboxId })}
        isLoading={isDisconnecting}
        confirmLabel="Desconectar"
      />
    </>
  )
}

export default EvolutionGoCard
