'use client'

import { useState, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  Wifi,
  WifiOff,
  Loader2,
  Phone,
  MessagesSquare,
  Activity,
  Clock,
  Hash,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { loadMetaSdk, type FBLoginResponse } from '@/_components/meta-sdk-loader'
import { connectMeta } from '@/_actions/inbox/connect-meta'
import { disconnectMeta } from '@/_actions/inbox/disconnect-meta'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'

interface MetaConnectionCardProps {
  inboxId: string
  canManage: boolean
  // Estado da conexao Meta
  isConnected: boolean
  metaPhoneDisplay: string | null
  metaWabaId: string | null
  connectionStats: AgentConnectionStats | null
}

// Captura sessionInfo do Embedded Signup para extrair wabaId e phoneNumberId
interface EmbeddedSignupSessionInfo {
  phone_number_id?: string
  waba_id?: string
}

/**
 * Card de conexao Meta WhatsApp Business API (API Oficial).
 *
 * Fluxo de conexao:
 * 1. Usuario clica "Conectar com WhatsApp Business"
 * 2. FB.login() abre o popup do Embedded Signup
 * 3. O sessionInfoListener captura wabaId + phoneNumberId via window.message event
 * 4. O callback do FB.login recebe o authorization code
 * 5. A action connectMeta troca o code por access_token server-side
 */
const MetaConnectionCard = ({
  inboxId,
  canManage,
  isConnected,
  metaPhoneDisplay,
  metaWabaId,
  connectionStats,
}: MetaConnectionCardProps) => {
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  // Controla estado de loading durante o fluxo de autorizacao (entre clicar e receber code)
  const [isAuthPending, setIsAuthPending] = useState(false)

  // Ref para capturar dados do Embedded Signup antes do callback do FB.login.
  // Precisa ser ref (nao state) para evitar stale closure no callback.
  const sessionInfoRef = useRef<EmbeddedSignupSessionInfo | null>(null)

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectMeta,
    {
      onSuccess: () => {
        setIsAuthPending(false)
        toast.success('WhatsApp Business conectado com sucesso!')
      },
      onError: ({ error }) => {
        setIsAuthPending(false)
        toast.error(error.serverError || 'Erro ao conectar WhatsApp Business.')
      },
    },
  )

  const { execute: executeDisconnect, isPending: isDisconnecting } = useAction(
    disconnectMeta,
    {
      onSuccess: () => {
        toast.success('WhatsApp Business desconectado.')
        setIsDisconnectOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao desconectar.')
      },
    },
  )

  const handleConnectClick = () => {
    sessionInfoRef.current = null
    setIsAuthPending(true)
    // Carrega o SDK e chama handleSdkReady quando estiver pronto
    loadMetaSdk(handleSdkReady)
  }

  const handleSdkReady = () => {
    if (!window.FB) return

    // Listener para capturar sessionInfo do Embedded Signup
    // O Meta envia eventos via window.message durante o fluxo
    const sessionInfoListener = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com') return

      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        if (data?.type === 'WA_EMBEDDED_SIGNUP' && data?.event === 'FINISH') {
          const sessionInfo = data.data as EmbeddedSignupSessionInfo
          sessionInfoRef.current = sessionInfo
          window.removeEventListener('message', sessionInfoListener)
        }
      } catch {
        // Ignora eventos nao JSON ou de outras origens
      }
    }

    window.addEventListener('message', sessionInfoListener)

    window.FB.login(
      (response: FBLoginResponse) => {
        window.removeEventListener('message', sessionInfoListener)

        if (!response.authResponse?.code) {
          setIsAuthPending(false)
          if (response.status !== 'unknown') {
            toast.error('Autorizacao cancelada ou nao completada.')
          }
          return
        }

        const code = response.authResponse.code

        // Usa ref para acessar o valor mais recente (evita stale closure)
        const sessionInfo = sessionInfoRef.current
        const wabaId = sessionInfo?.waba_id
        const phoneNumberId = sessionInfo?.phone_number_id

        if (!wabaId || !phoneNumberId) {
          setIsAuthPending(false)
          toast.error(
            'Nao foi possivel capturar os dados da conta WhatsApp Business. Tente novamente.',
          )
          return
        }

        executeConnect({
          inboxId,
          code,
          wabaId,
          phoneNumberId,
        })
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          sessionInfoVersion: 3,
          setup: {},
        },
      },
    )
  }

  // Estado: Conectado
  if (isConnected) {
    return (
      <>
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Wifi className="h-5 w-5 text-kronos-green" />
                WhatsApp Business Conectado
              </CardTitle>
              <Badge
                variant="outline"
                className="border-kronos-green/20 bg-kronos-green/10 px-2 text-xs font-semibold text-kronos-green"
              >
                API Oficial
              </Badge>
            </div>
            <CardDescription>
              Esta caixa de entrada esta conectada via API Oficial do WhatsApp
              Business (Meta Cloud API).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informacoes da conta */}
            <div className="grid gap-4 sm:grid-cols-2">
              {metaPhoneDisplay && (
                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefone</p>
                    <p className="text-sm font-medium">{metaPhoneDisplay}</p>
                  </div>
                </div>
              )}

              {metaWabaId && (
                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">WABA ID</p>
                    <p className="font-mono text-sm font-medium">{metaWabaId}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Stats de uso */}
            {connectionStats && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                  <MessagesSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Conversas</p>
                    <p className="text-sm font-medium">
                      {connectionStats.conversationsCount}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Mensagens hoje
                    </p>
                    <p className="text-sm font-medium">
                      {connectionStats.messagesToday}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Ultima atividade
                    </p>
                    <p className="text-sm font-medium">
                      {connectionStats.lastMessageAt
                        ? formatDistanceToNow(
                            new Date(connectionStats.lastMessageAt),
                            { addSuffix: true, locale: ptBR },
                          )
                        : 'Nenhuma'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botao desconectar */}
            {canManage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="destructive"
                  onClick={() => setIsDisconnectOpen(true)}
                >
                  Desconectar WhatsApp Business
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmationDialog
          open={isDisconnectOpen}
          onOpenChange={setIsDisconnectOpen}
          title="Desconectar WhatsApp Business?"
          description={
            <p>
              Esta caixa de entrada deixara de receber e enviar mensagens via
              API Oficial do Meta. Voce podera reconectar depois.
            </p>
          }
          icon={<WifiOff />}
          variant="destructive"
          onConfirm={() => executeDisconnect({ inboxId })}
          isLoading={isDisconnecting}
          confirmLabel="Desconectar"
        />
      </>
    )
  }

  // Estado: Desconectado
  return (
    <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <WifiOff className="h-5 w-5" />
            WhatsApp Business Desconectado
          </CardTitle>
          <CardDescription>
            Conecte via API Oficial do WhatsApp Business para receber e enviar
            mensagens com um numero verificado pela Meta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-muted p-4">
              <Phone className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Ao conectar, voce sera redirecionado para o fluxo de autorizacao
              da Meta. Sera necessario ter uma conta do WhatsApp Business
              Platform configurada.
            </p>
            {canManage && (
              <Button
                onClick={handleConnectClick}
                disabled={isAuthPending || isConnecting}
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Salvando conexao...
                  </div>
                ) : isAuthPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Aguardando autorizacao...
                  </div>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Conectar com WhatsApp Business
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
  )
}

export default MetaConnectionCard
