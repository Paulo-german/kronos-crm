'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import {
  MessageSquare,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { connectEvolution } from '@/_actions/agent/connect-evolution'
import { getEvolutionQR } from '@/_actions/agent/get-evolution-qr'
import { disconnectEvolution } from '@/_actions/agent/disconnect-evolution'
import type { AgentDetailDto } from '@/_data-access/agent/get-agent-by-id'

interface ConnectionTabProps {
  agent: AgentDetailDto
  canManage: boolean
}

type ConnectionState = 'disconnected' | 'checking' | 'connecting' | 'connected'

const POLL_INTERVAL = 5000 // 5s
const QR_TIMEOUT = 120000 // 2min

const ConnectionTab = ({ agent, canManage }: ConnectionTabProps) => {
  // Se já tem instância, inicia com 'checking' (verifica status real)
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    agent.evolutionInstanceName ? 'checking' : 'disconnected',
  )

  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectEvolution,
    {
      onSuccess: ({ data }) => {
        toast.success('Instância criada! Escaneie o QR code.')
        // Usa o QR code retornado pela criação da instância (se disponível)
        if (data?.qrBase64) {
          setQrBase64(data.qrBase64)
        }
        setConnectionState('connecting')
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao conectar WhatsApp.')
      },
    },
  )

  const { execute: executeGetQR } = useAction(getEvolutionQR, {
    onSuccess: ({ data }) => {
      if (!data) return

      if (data.state === 'open') {
        setConnectionState('connected')
        setQrBase64(null)
        setQrCode(null)
        setPairingCode(null)
        stopPolling()
        return
      }

      // Se estava verificando e não está conectado, vai para connecting
      setConnectionState('connecting')

      if (data.base64) {
        setQrBase64(data.base64)
      }
      if (data.code) {
        setQrCode(data.code)
      }
      if (data.pairingCode) {
        setPairingCode(data.pairingCode)
      }
    },
    onError: () => {
      // Se estava verificando e o poll falhou, mostra como connecting
      setConnectionState((prev) => (prev === 'checking' ? 'connecting' : prev))
    },
  })

  const { execute: executeDisconnect, isPending: isDisconnecting } = useAction(
    disconnectEvolution,
    {
      onSuccess: () => {
        toast.success('WhatsApp desconectado.')
        setConnectionState('disconnected')
        setQrBase64(null)
        setQrCode(null)
        setPairingCode(null)
        setIsDisconnectOpen(false)
        stopPolling()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao desconectar.')
      },
    },
  )

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startPolling = useCallback(() => {
    stopPolling()

    // Poll imediato
    executeGetQR({ agentId: agent.id })

    pollRef.current = setInterval(() => {
      executeGetQR({ agentId: agent.id })
    }, POLL_INTERVAL)

    // Timeout de 2 min
    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setQrBase64(null)
      setQrCode(null)
      setPairingCode(null)
    }, QR_TIMEOUT)
  }, [agent.id, executeGetQR, stopPolling])

  // Inicia polling quando entra no estado checking ou connecting
  useEffect(() => {
    if (
      (connectionState === 'checking' || connectionState === 'connecting') &&
      agent.evolutionInstanceName
    ) {
      startPolling()
    }

    return () => stopPolling()
  }, [connectionState, agent.evolutionInstanceName, startPolling, stopPolling])

  // Estado 1 — Desconectado
  if (connectionState === 'disconnected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WifiOff className="h-5 w-5" />
            WhatsApp Desconectado
          </CardTitle>
          <CardDescription>
            Conecte uma conta WhatsApp para que o agente possa receber e enviar
            mensagens automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Ao conectar, uma instância será criada na Evolution API. Você
              precisará escanear o QR code com o WhatsApp do seu celular.
            </p>
            {canManage && (
              <Button
                onClick={() => executeConnect({ agentId: agent.id })}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin" />
                    Conectando...
                  </div>
                ) : (
                  <>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado intermediário — Verificando conexão existente
  if (connectionState === 'checking') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Verificando Conexão
          </CardTitle>
          <CardDescription>
            Verificando o status da conexão WhatsApp...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado 2 — Conectando (QR Code)
  if (connectionState === 'connecting') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Escaneie o QR Code
          </CardTitle>
          <CardDescription>
            Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e
            escaneie o código abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            {qrCode ? (
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG value={qrCode} size={256} />
              </div>
            ) : qrBase64 ? (
              <div className="rounded-lg border bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    qrBase64.startsWith('data:')
                      ? qrBase64
                      : `data:image/png;base64,${qrBase64}`
                  }
                  alt="QR Code WhatsApp"
                  className="h-64 w-64"
                />
              </div>
            ) : pairingCode ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border p-8">
                <p className="text-sm font-medium text-muted-foreground">
                  Código de pareamento:
                </p>
                <p className="font-mono text-3xl font-bold tracking-widest">
                  {pairingCode}
                </p>
                <p className="max-w-xs text-center text-xs text-muted-foreground">
                  No WhatsApp, vá em Configurações → Dispositivos Conectados → Conectar
                  com número de telefone e insira o código acima.
                </p>
              </div>
            ) : (
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Atualiza automaticamente a cada 5 segundos.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={startPolling}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Gerar novo QR Code
              </Button>
              {canManage && (
                <Button
                  variant="ghost"
                  onClick={() => executeDisconnect({ agentId: agent.id })}
                  disabled={isDisconnecting}
                >
                  {isDisconnecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado 3 — Conectado
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 text-green-600" />
            WhatsApp Conectado
          </CardTitle>
          <CardDescription>
            O agente está recebendo e respondendo mensagens via WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <Badge
              variant="default"
              className="bg-green-600 px-4 py-2 text-sm hover:bg-green-700"
            >
              Conectado
            </Badge>
            {agent.evolutionInstanceName && (
              <p className="text-sm text-muted-foreground">
                Instância: {agent.evolutionInstanceName}
              </p>
            )}
            {canManage && (
              <Button
                variant="destructive"
                onClick={() => setIsDisconnectOpen(true)}
              >
                Desconectar WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isDisconnectOpen}
        onOpenChange={setIsDisconnectOpen}
        title="Desconectar WhatsApp?"
        description={
          <p>
            O agente deixará de receber e responder mensagens via WhatsApp. Você
            poderá reconectar depois.
          </p>
        }
        icon={<WifiOff />}
        variant="destructive"
        onConfirm={() => executeDisconnect({ agentId: agent.id })}
        isLoading={isDisconnecting}
        confirmLabel="Desconectar"
      />
    </>
  )
}

export default ConnectionTab
