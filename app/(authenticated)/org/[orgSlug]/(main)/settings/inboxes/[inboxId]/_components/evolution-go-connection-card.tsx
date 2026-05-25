'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import Image from 'next/image'
import {
  MessageSquare,
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
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
import { getEvolutionGoQr } from '@/_actions/inbox/get-evolution-go-qr'
import { syncEvolutionGoStatus } from '@/_actions/inbox/sync-evolution-go-status'
import { disconnectEvolutionGoInbox } from '@/_actions/inbox/disconnect-evolution-go-inbox'

interface EvolutionGoConnectionCardProps {
  inboxId: string
  canManage: boolean
  initialConnected: boolean
  onConnectionStateChange?: (connected: boolean) => void
}

type ConnectionState = 'disconnected' | 'checking' | 'connecting' | 'connected'

const POLL_INTERVAL = 5000
const QR_TIMEOUT = 120000

const EvolutionGoConnectionCard = ({
  inboxId,
  canManage,
  initialConnected,
  onConnectionStateChange,
}: EvolutionGoConnectionCardProps) => {
  // Sempre verifica o estado real no servidor ao montar — initialConnected pode estar
  // desatualizado (ex: credenciais recém-salvas sempre persistem evolutionConnected: false)
  const [connectionState, setConnectionState] = useState<ConnectionState>('checking')
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [isQrExpired, setIsQrExpired] = useState(false)
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSyncedRef = useRef(false)

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

  const { execute: executeSync } = useAction(syncEvolutionGoStatus)

  const { execute: executeGetQR } = useAction(getEvolutionGoQr, {
    onSuccess: ({ data }) => {
      if (!data) return

      if (data.state === 'open') {
        setConnectionState('connected')
        setQrBase64(null)
        setQrCode(null)
        setPairingCode(null)
        stopPolling()
        onConnectionStateChange?.(true)
        if (!hasSyncedRef.current && !initialConnected) {
          hasSyncedRef.current = true
          executeSync({ inboxId })
        }
        return
      }

      setConnectionState('connecting')
      onConnectionStateChange?.(false)
      if (!hasSyncedRef.current && initialConnected) {
        hasSyncedRef.current = true
        executeSync({ inboxId })
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
    disconnectEvolutionGoInbox,
    {
      onSuccess: () => {
        toast.success('Conexão marcada como desconectada.')
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
    if (connectionState === 'checking' || connectionState === 'connecting') {
      startPolling()
    }
    return () => stopPolling()
  }, [connectionState, startPolling, stopPolling])

  if (connectionState === 'disconnected') {
    return (
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
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
              <CardTitle className="text-base font-semibold">Conexão WhatsApp</CardTitle>
              <CardDescription>Conecte escaneando o QR Code da instância</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="rounded-full bg-muted p-4">
              <MessageSquare className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="max-w-md text-center text-sm text-muted-foreground">
              Clique em conectar para obter o QR Code da sua instância Evolution Go e parear o WhatsApp.
            </p>
            {canManage && (
              <Button onClick={() => setConnectionState('connecting')}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Conectar WhatsApp
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (connectionState === 'checking') {
    return (
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
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
              <CardTitle className="text-base font-semibold">Conexão WhatsApp</CardTitle>
              <CardDescription>Verificando conexão...</CardDescription>
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
                src="/images/providers/evolution-go.png"
                alt="Evolution Go"
                fill
                className="rounded-md object-contain"
                sizes="32px"
              />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Conexão WhatsApp</CardTitle>
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
                    <p className="text-xs text-muted-foreground">QR Code expirado</p>
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
                onClick={() => {
                  stopPolling()
                  setConnectionState('disconnected')
                  setQrBase64(null)
                  setQrCode(null)
                  setPairingCode(null)
                }}
              >
                Cancelar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Estado conectado
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
                <CardTitle className="text-base font-semibold">Conexão WhatsApp</CardTitle>
                <CardDescription>Evolution Go (Self-hosted)</CardDescription>
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
        <CardContent>
          <div className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3">
            <Server className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Instância</p>
              <p className="text-sm font-medium text-emerald-600">WhatsApp pareado com sucesso</p>
            </div>
          </div>

          {canManage && (
            <div className="mt-4 flex justify-center">
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
            O status desta caixa de entrada será marcado como desconectado no Kronos.
            <br />
            <span className="text-muted-foreground">
              A instância no servidor Evolution Go não será afetada.
            </span>
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

export default EvolutionGoConnectionCard
