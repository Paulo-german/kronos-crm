'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Image from 'next/image'
import {
  MessageSquare,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Phone,
  User,
  Server,
  MessagesSquare,
  Activity,
  Clock,
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
import { connectEvolution } from '@/_actions/inbox/connect-evolution'
import { getEvolutionQR } from '@/_actions/inbox/get-evolution-qr'
import { disconnectEvolution } from '@/_actions/inbox/disconnect-evolution'
import { syncEvolutionStatus } from '@/_actions/inbox/sync-evolution-status'
import { formatPhoneFromJid } from '@/_lib/whatsapp/format-phone'
import type { AgentConnectionStats } from '@/_data-access/agent/get-agent-connection-stats'
import type { EvolutionInstanceInfo } from '@/_lib/evolution-js/types-instance'

interface InboxConnectionCardProps {
  inboxId: string
  canManage: boolean
  connectionStats: AgentConnectionStats | null
  instanceInfo: EvolutionInstanceInfo | null
  hasInstance: boolean
  instanceName: string | null
  initialConnected: boolean
  onConnectionStateChange?: (connected: boolean) => void
  // Indica se este inbox usa instancia Evolution self-hosted do usuario
  isSelfHosted?: boolean
}

type ConnectionState = 'disconnected' | 'checking' | 'connecting' | 'connected'

const POLL_INTERVAL = 5000
const QR_TIMEOUT = 120000

const InboxConnectionCard = ({
  inboxId,
  canManage,
  connectionStats,
  instanceInfo,
  hasInstance,
  instanceName,
  initialConnected,
  onConnectionStateChange,
  isSelfHosted = false,
}: InboxConnectionCardProps) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    hasInstance ? 'checking' : 'disconnected',
  )

  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isQrExpired, setIsQrExpired] = useState(false)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSyncedRef = useRef(false)

  const { execute: executeSync } = useAction(syncEvolutionStatus)

  const { execute: executeConnect, isPending: isConnecting } = useAction(
    connectEvolution,
    {
      onSuccess: ({ data }) => {
        toast.success('Instância criada! Escaneie o QR code.')
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
        onConnectionStateChange?.(true)
        // Sincronizar banco se estava marcado como desconectado
        if (!hasSyncedRef.current && !initialConnected) {
          hasSyncedRef.current = true
          executeSync({ inboxId, connected: true })
        }
        return
      }

      setConnectionState('connecting')
      onConnectionStateChange?.(false)
      // Sincronizar banco se estava marcado como conectado
      if (!hasSyncedRef.current && initialConnected) {
        hasSyncedRef.current = true
        executeSync({ inboxId, connected: false })
      }

      if (data.base64) setQrBase64(data.base64)
      if (data.code) setQrCode(data.code)
      if (data.pairingCode) setPairingCode(data.pairingCode)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Não foi possível verificar o status da conexão.')
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
        setIsQrExpired(false)
        setIsDisconnectOpen(false)
        stopPolling()
        hasSyncedRef.current = false
        onConnectionStateChange?.(false)
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
    setIsQrExpired(false)

    executeGetQR({ inboxId })

    pollRef.current = setInterval(() => {
      executeGetQR({ inboxId })
    }, POLL_INTERVAL)

    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setQrBase64(null)
      setQrCode(null)
      setPairingCode(null)
      setIsQrExpired(true)
      toast.error('QR Code expirou. Clique em "Gerar novo QR Code" para tentar novamente.')
    }, QR_TIMEOUT)
  }, [inboxId, executeGetQR, stopPolling])

  useEffect(() => {
    if (
      connectionState === 'checking' ||
      connectionState === 'connecting'
    ) {
      startPolling()
    }

    return () => stopPolling()
  }, [connectionState, startPolling, stopPolling])

  const handleConnect = () => {
    executeConnect({ inboxId })
  }

  // Estado 1 — Desconectado
  if (connectionState === 'disconnected') {
    return (
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/images/providers/whatsapp-meta.svg"
                  alt="WhatsApp"
                  fill
                  className="rounded-md object-contain"
                  sizes="32px"
                />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
                <CardDescription>Conecte escaneando o QR Code</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-muted p-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              {isSelfHosted
                ? 'A conexão será feita usando sua instância Evolution API. Selecione a instância e escaneie o QR Code se necessário.'
                : 'Ao conectar, você precisará escanear o QR Code com o WhatsApp do seu celular.'}
            </p>
            {canManage && (
              <Button onClick={handleConnect} disabled={isConnecting}>
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

  // Estado intermediário — Verificando
  if (connectionState === 'checking') {
    return (
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/images/providers/whatsapp-meta.svg"
                  alt="WhatsApp"
                  fill
                  className="rounded-md object-contain"
                  sizes="32px"
                />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
                <CardDescription>Verificando conexão...</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado 2 — QR Code
  if (connectionState === 'connecting') {
    const qrSteps = [
      { step: 1, text: 'Abra o WhatsApp no seu celular' },
      { step: 2, text: 'Toque em Menu (⋮) ou Configurações' },
      { step: 3, text: 'Selecione Dispositivos conectados' },
      { step: 4, text: 'Toque em Conectar um dispositivo' },
      { step: 5, text: 'Aponte a câmera para o QR Code' },
    ]

    return (
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 shrink-0">
              <Image
                src="/images/providers/whatsapp-meta.svg"
                alt="WhatsApp"
                fill
                className="rounded-md object-contain"
                sizes="32px"
              />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
              <CardDescription>Escaneie o QR Code para conectar</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pairingCode ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-background/70 px-8 py-6">
                <p className="text-xs font-medium text-muted-foreground">
                  Código de pareamento
                </p>
                <p className="font-mono text-4xl font-bold tracking-[0.3em]">
                  {pairingCode}
                </p>
              </div>
              <p className="max-w-xs text-center text-xs text-muted-foreground">
                No WhatsApp → Configurações → Dispositivos conectados →
                Conectar com número de telefone → insira o código acima.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6 py-2 sm:flex-row sm:items-start sm:gap-8">
              {/* QR Code */}
              <div className="flex shrink-0 flex-col items-center gap-2">
                {qrCode ? (
                  <div className="rounded-xl border border-border/50 bg-white p-3">
                    <QRCodeSVG value={qrCode} size={200} />
                  </div>
                ) : qrBase64 ? (
                  <div className="rounded-xl border border-border/50 bg-white p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        qrBase64.startsWith('data:')
                          ? qrBase64
                          : `data:image/png;base64,${qrBase64}`
                      }
                      alt="QR Code WhatsApp"
                      className="h-[200px] w-[200px]"
                    />
                  </div>
                ) : isQrExpired ? (
                  <div className="flex h-[200px] w-[200px] flex-col items-center justify-center gap-2 rounded-xl border border-border/50 bg-background/70 px-4 text-center">
                    <RefreshCw className="h-6 w-6 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      QR Code expirado
                    </p>
                  </div>
                ) : (
                  <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-border/50 bg-background/70">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isQrExpired && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Atualiza a cada 5 segundos
                  </p>
                )}
              </div>

              {/* Passos */}
              <div className="flex flex-1 flex-col justify-center gap-1">
                <p className="mb-3 text-sm font-medium">Como escanear:</p>
                {qrSteps.map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 py-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {step}
                    </span>
                    <span className="text-sm text-muted-foreground">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-4">
            <Button variant="outline" size="sm" onClick={startPolling}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Gerar novo QR Code
            </Button>
            {canManage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => executeDisconnect({ inboxId })}
                disabled={isDisconnecting}
              >
                {isDisconnecting && (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                )}
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado 3 — Conectado
  return (
    <>
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/images/providers/whatsapp-meta.svg"
                  alt="WhatsApp"
                  fill
                  className="rounded-md object-contain"
                  sizes="32px"
                />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">WhatsApp</CardTitle>
                <CardDescription>Gerenciado pela Kronos</CardDescription>
              </div>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
            >
              <Wifi className="h-3 w-3" />
              Conectado
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info da conta */}
          <div className="grid gap-4 sm:grid-cols-2">
            {instanceInfo?.ownerJid && (
              <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="text-sm font-medium">
                    {formatPhoneFromJid(instanceInfo.ownerJid)}
                  </p>
                </div>
              </div>
            )}

            {instanceInfo?.profileName && (
              <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Perfil</p>
                  <p className="text-sm font-medium">
                    {instanceInfo.profileName}
                  </p>
                </div>
              </div>
            )}

            {instanceName && (
              <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
                <Server className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Instância</p>
                  <p className="text-sm font-medium">{instanceName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
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
                    Última atividade
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

          {/* Botão desconectar */}
          {canManage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="destructive"
                onClick={() => setIsDisconnectOpen(true)}
              >
                Desconectar WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationDialog
        open={isDisconnectOpen}
        onOpenChange={setIsDisconnectOpen}
        title="Desconectar WhatsApp?"
        description={
          <p>
            Esta caixa de entrada deixará de receber e enviar mensagens via
            WhatsApp. Você poderá reconectar depois.
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

export default InboxConnectionCard
