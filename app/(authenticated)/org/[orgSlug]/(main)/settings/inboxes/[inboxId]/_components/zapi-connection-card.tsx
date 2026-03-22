'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { connectZApi } from '@/_actions/inbox/connect-zapi'
import { disconnectZApi } from '@/_actions/inbox/disconnect-zapi'
import { getZApiQR } from '@/_actions/inbox/get-zapi-qr'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'

interface ZApiConnectionCardProps {
  inboxId: string
  canManage: boolean
  // Estado conectado (vem do server)
  isConnected: boolean
  zapiPhone: string | null
  connectionStats: AgentConnectionStats | null
}

type ConnectionState = 'form' | 'connecting' | 'connected'

const QR_POLL_INTERVAL = 15000

const ZApiConnectionCard = ({
  inboxId,
  canManage,
  isConnected: initialConnected,
  zapiPhone,
  connectionStats,
}: ZApiConnectionCardProps) => {
  const router = useRouter()
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    initialConnected ? 'connected' : 'form',
  )
  const [instanceId, setInstanceId] = useState('')
  const [token, setToken] = useState('')
  const [clientToken, setClientToken] = useState('')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectZApi,
    {
      onSuccess: ({ data }) => {
        if (data?.connected) {
          toast.success('Z-API conectada com sucesso!')
          setConnectionState('connected')
          router.refresh()
        } else {
          toast.success('Credenciais salvas! Escaneie o QR code para conectar.')
          setConnectionState('connecting')
          startQRPolling()
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao conectar Z-API.')
      },
    },
  )

  const { execute: executeDisconnect, isPending: isDisconnecting } = useAction(
    disconnectZApi,
    {
      onSuccess: () => {
        toast.success('Z-API desconectada.')
        setConnectionState('form')
        setInstanceId('')
        setToken('')
        setClientToken('')
        router.refresh()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao desconectar Z-API.')
      },
    },
  )

  const { execute: executeGetQR } = useAction(getZApiQR, {
    onSuccess: ({ data }) => {
      if (data?.connected) {
        toast.success('WhatsApp conectado!')
        setConnectionState('connected')
        router.refresh()
        stopPolling()
        return
      }
      if (data?.base64) {
        setQrBase64(data.base64)
      }
    },
  })

  function startQRPolling() {
    stopPolling()
    pollRef.current = setInterval(() => {
      executeGetQR({ inboxId })
    }, QR_POLL_INTERVAL)
    // Buscar primeiro QR imediatamente
    executeGetQR({ inboxId })
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => {
    return () => stopPolling()
  }, [])

  function handleConnect() {
    if (!instanceId.trim() || !token.trim() || !clientToken.trim()) {
      toast.error('Preencha todos os campos.')
      return
    }
    executeConnect({
      inboxId,
      instanceId: instanceId.trim(),
      token: token.trim(),
      clientToken: clientToken.trim(),
    })
  }

  // Estado conectado
  if (connectionState === 'connected') {
    return (
      <Card className="border-green-600/30 bg-green-600/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Wifi className="h-5 w-5 text-green-600" />
            Z-API Conectada
            <Badge variant="outline" className="border-green-600/50 text-green-600">
              Online
            </Badge>
          </CardTitle>
          <CardDescription>Conexao WhatsApp via Z-API ativa.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zapiPhone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Telefone:</span>
              <span className="font-medium">{zapiPhone}</span>
            </div>
          )}

          {connectionStats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <MessagesSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Conversas:</span>
                <span className="font-medium">{connectionStats.conversationsCount}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Msgs hoje:</span>
                <span className="font-medium">{connectionStats.messagesToday}</span>
              </div>
              {connectionStats.lastMessageAt && (
                <div className="col-span-2 flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Ultima atividade:</span>
                  <span className="font-medium">
                    {formatDistanceToNow(connectionStats.lastMessageAt, {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
              )}
            </div>
          )}

          {canManage && (
            <>
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setIsDisconnectOpen(true)}
              >
                <WifiOff className="mr-2 h-4 w-4" />
                Desconectar Z-API
              </Button>

              <ConfirmationDialog
                open={isDisconnectOpen}
                onOpenChange={setIsDisconnectOpen}
                title="Desconectar Z-API?"
                description={
                  <p>
                    A conexao com o WhatsApp sera removida e mensagens nao serao
                    mais processadas. Voce podera reconectar depois.
                  </p>
                }
                icon={<WifiOff />}
                variant="destructive"
                onConfirm={() => executeDisconnect({ inboxId })}
                isLoading={isDisconnecting}
                confirmLabel="Desconectar"
              />
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  // Estado conectando (QR code polling)
  if (connectionState === 'connecting') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Loader2 className="h-5 w-5 animate-spin" />
            Conectando Z-API
          </CardTitle>
          <CardDescription>
            Escaneie o QR code abaixo com o WhatsApp no seu celular.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {qrBase64 ? (
            <div className="rounded-lg border bg-white p-4">
              <img
                src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                alt="QR Code Z-API"
                className="h-64 w-64"
              />
            </div>
          ) : (
            <div className="flex h-64 w-64 items-center justify-center rounded-lg border">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <p className="text-center text-xs text-muted-foreground">
            O QR code atualiza automaticamente a cada 15 segundos.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopPolling()
              setConnectionState('form')
              setQrBase64(null)
            }}
          >
            Cancelar
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Estado formulario (desconectado)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <WifiOff className="h-5 w-5 text-muted-foreground" />
          Conectar Z-API
        </CardTitle>
        <CardDescription>
          Insira as credenciais da sua instancia Z-API. Voce encontra esses dados
          no painel da Z-API ao editar sua instancia.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="zapi-instance-id">Instance ID</Label>
          <Input
            id="zapi-instance-id"
            placeholder="Ex: 3B4F7A8C9D..."
            value={instanceId}
            onChange={(event) => setInstanceId(event.target.value)}
            disabled={isConnecting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zapi-token">Token</Label>
          <Input
            id="zapi-token"
            type="password"
            placeholder="Token da instancia"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            disabled={isConnecting}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zapi-client-token">Client-Token</Label>
          <Input
            id="zapi-client-token"
            type="password"
            placeholder="Token de seguranca da conta"
            value={clientToken}
            onChange={(event) => setClientToken(event.target.value)}
            disabled={isConnecting}
          />
        </div>

        {canManage && (
          <Button
            className="w-full"
            onClick={handleConnect}
            disabled={isConnecting || !instanceId || !token || !clientToken}
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conectando...
              </>
            ) : (
              'Conectar Z-API'
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default ZApiConnectionCard
