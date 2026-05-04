'use client'

import { useState, useEffect } from 'react'
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
import { disconnectInstagram } from '@/_actions/inbox/disconnect-instagram'

interface ConnectInstagramButtonProps {
  inboxId: string
  canManage: boolean
  isConnected: boolean
  igUsername: string | null
  igUserId: string | null
}

/**
 * Card de conexão Instagram Direct via OAuth redirect-based.
 *
 * Fluxo de conexão:
 * 1. Usuário clica "Conectar com Instagram Business"
 * 2. GET /api/integrations/instagram/auth-url?inboxId=<id> retorna a URL de autorização
 * 3. Usuário é redirecionado para instagram.com/oauth/authorize
 * 4. Instagram redireciona de volta para /api/integrations/instagram/callback com o code
 * 5. O callback troca o code por tokens e atualiza o inbox
 */
const ConnectInstagramButton = ({
  inboxId,
  canManage,
  isConnected,
  igUsername,
  igUserId,
}: ConnectInstagramButtonProps) => {
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Sincroniza com o resultado do redirect OAuth do Instagram
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('instagram')
    const error = params.get('instagram_error')

    if (!connected && !error) return

    window.history.replaceState({}, '', window.location.pathname)

    if (connected === 'connected') {
      toast.success('Instagram conectado com sucesso!')
      return
    }

    const detail = params.get('instagram_error_detail')

    const errorMessages: Record<string, string> = {
      access_denied: 'Autorização cancelada.',
      user_mismatch: 'Erro de segurança. Tente novamente.',
      state_expired: 'Sessão expirada. Tente novamente.',
      short_token_failed: 'Erro ao obter token de acesso.',
      long_token_failed: 'Erro ao renovar token de acesso.',
      token_exchange_failed: 'Erro ao trocar token de acesso.',
      invalid_state: 'Estado inválido. Tente novamente.',
      inbox_not_found: 'Caixa de entrada não encontrada.',
      already_connected: 'Esta conta Instagram já está conectada a outra caixa de entrada.',
    }

    const baseMessage = errorMessages[error ?? ''] ?? 'Erro ao conectar Instagram.'
    toast.error(baseMessage, { description: detail ?? undefined })
  }, [])

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

  const handleConnectClick = async () => {
    setIsRedirecting(true)
    try {
      const response = await fetch(
        `/api/integrations/instagram/auth-url?inboxId=${inboxId}`,
      )

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        toast.error(body?.error ?? 'Erro ao gerar URL de autorização.')
        setIsRedirecting(false)
        return
      }

      const data = (await response.json()) as { url: string }
      window.location.href = data.url
    } catch {
      toast.error('Erro inesperado ao iniciar conexão com Instagram.')
      setIsRedirecting(false)
    }
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
            Ao conectar, você será redirecionado para o fluxo de autorização do
            Instagram. Será necessário ter uma conta Instagram Business.
          </p>
          {canManage && (
            <Button onClick={handleConnectClick} disabled={isRedirecting}>
              {isRedirecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Redirecionando...
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
