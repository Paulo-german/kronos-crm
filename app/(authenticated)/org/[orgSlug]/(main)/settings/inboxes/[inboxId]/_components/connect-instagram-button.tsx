'use client'

import { useState, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Instagram, Loader2, WifiOff } from 'lucide-react'
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
import { connectInstagram } from '@/_actions/inbox/connect-instagram'
import { disconnectInstagram } from '@/_actions/inbox/disconnect-instagram'

// Campos retornados pelo Meta Embedded Signup para Instagram
interface InstagramEmbeddedSignupData {
  ig_user_id?: string
  page_id?: string
}

interface ConnectInstagramButtonProps {
  inboxId: string
  canManage: boolean
  isConnected: boolean
  igUsername: string | null
  igUserId: string | null
}

/**
 * Card de conexão Instagram Direct via Meta Embedded Signup.
 *
 * Fluxo de conexão:
 * 1. Usuário clica "Conectar com Instagram Business"
 * 2. FB.login() abre o popup do Embedded Signup com config de Instagram
 * 3. O sessionInfoListener captura igUserId + pageId via window.message event
 * 4. O callback do FB.login recebe o authorization code
 * 5. A action connectInstagram troca o code por access_token server-side
 *
 * O useEffect de sincronização com o SDK do Meta é exceção válida à regra de useEffect.
 */
const ConnectInstagramButton = ({
  inboxId,
  canManage,
  isConnected,
  igUsername,
  igUserId,
}: ConnectInstagramButtonProps) => {
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const [isAuthPending, setIsAuthPending] = useState(false)

  // Ref para capturar dados do Embedded Signup antes do callback do FB.login.
  // Precisa ser ref (não state) para evitar stale closure no callback.
  const sessionDataRef = useRef<InstagramEmbeddedSignupData | null>(null)

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectInstagram,
    {
      onSuccess: ({ data }) => {
        setIsAuthPending(false)
        const username = data?.igUsername
        toast.success(
          username
            ? `Instagram @${username} conectado com sucesso!`
            : 'Instagram conectado com sucesso!',
        )
      },
      onError: ({ error }) => {
        setIsAuthPending(false)
        toast.error(error.serverError || 'Erro ao conectar Instagram.')
      },
    },
  )

  const { execute: executeDisconnect, isPending: isDisconnecting } = useAction(
    disconnectInstagram,
    {
      onSuccess: () => {
        toast.success('Instagram desconectado.')
        setIsDisconnectOpen(false)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao desconectar Instagram.')
      },
    },
  )

  const handleConnectClick = () => {
    sessionDataRef.current = null
    setIsAuthPending(true)
    loadMetaSdk(handleSdkReady)
  }

  const handleSdkReady = () => {
    if (!window.FB) return

    // Listener para capturar dados de conta do Embedded Signup Instagram.
    // O Meta envia eventos via window.message durante o fluxo de autorização.
    const sessionInfoListener = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return

      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        // Instagram Embedded Signup emite eventos com type 'IG_EMBEDDED_SIGNUP'
        if (data?.type === 'IG_EMBEDDED_SIGNUP' || data?.type === 'WA_EMBEDDED_SIGNUP') {
          const finishEvents = [
            'FINISH',
            'FINISH_ONLY_WABA',
            'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
          ]
          if (finishEvents.includes(data?.event)) {
            const signupData = data.data as InstagramEmbeddedSignupData
            sessionDataRef.current = signupData
            window.removeEventListener('message', sessionInfoListener)
          }
        }
      } catch {
        // Ignora eventos não JSON ou de outras origens
      }
    }

    window.addEventListener('message', sessionInfoListener)

    window.FB.login(
      (response: FBLoginResponse) => {
        window.removeEventListener('message', sessionInfoListener)

        if (!response.authResponse?.code) {
          setIsAuthPending(false)
          if (response.status !== 'unknown') {
            toast.error('Autorização cancelada ou não completada.')
          }
          return
        }

        const code = response.authResponse.code
        const signupData = sessionDataRef.current
        const igUserIdFromSignup = signupData?.ig_user_id
        const pageIdFromSignup = signupData?.page_id

        if (!igUserIdFromSignup || !pageIdFromSignup) {
          setIsAuthPending(false)
          toast.error(
            'Não foi possível capturar os dados da conta Instagram Business. Tente novamente.',
          )
          return
        }

        executeConnect({
          inboxId,
          code,
          igUserId: igUserIdFromSignup,
          pageId: pageIdFromSignup,
        })
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_INSTAGRAM_CONFIG_ID,
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
  if (isConnected && igUserId) {
    return (
      <>
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Instagram className="h-5 w-5 text-pink-500" />
                Instagram Direct Conectado
              </CardTitle>
              <Badge
                variant="outline"
                className="border-kronos-green/20 bg-kronos-green/10 px-2 text-xs font-semibold text-kronos-green"
              >
                Conectado
              </Badge>
            </div>
            <CardDescription>
              Esta caixa de entrada está recebendo mensagens via Instagram Direct.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {igUsername && (
              <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                <Instagram className="h-4 w-4 text-pink-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Conta Instagram</p>
                  <p className="text-sm font-medium">@{igUsername}</p>
                </div>
              </div>
            )}

            {canManage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="destructive"
                  onClick={() => setIsDisconnectOpen(true)}
                >
                  Desconectar Instagram
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmationDialog
          open={isDisconnectOpen}
          onOpenChange={setIsDisconnectOpen}
          title="Desconectar Instagram?"
          description={
            <p>
              Esta caixa de entrada deixará de receber e enviar mensagens via
              Instagram Direct. Você poderá reconectar depois.
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
          <Instagram className="h-5 w-5" />
          Instagram Direct Desconectado
        </CardTitle>
        <CardDescription>
          Conecte uma conta Instagram Business para receber e enviar mensagens
          diretas via Instagram.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="rounded-full bg-muted p-4">
            <Instagram className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            Ao conectar, você será redirecionado para o fluxo de autorização da
            Meta. Será necessário ter uma conta Instagram Business vinculada a
            uma Página do Facebook.
          </p>
          {canManage && (
            <Button
              onClick={handleConnectClick}
              disabled={isAuthPending || isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando conexão...
                </>
              ) : isAuthPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aguardando autorização...
                </>
              ) : (
                <>
                  <Instagram className="mr-2 h-4 w-4" />
                  Conectar com Instagram Business
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ConnectInstagramButton
