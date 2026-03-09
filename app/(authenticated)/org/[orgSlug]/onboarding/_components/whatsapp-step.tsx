'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'
import { motion } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  RefreshCw,
  SendHorizontal,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { setupWhatsapp } from '@/_actions/onboarding/setup-whatsapp'
import { getEvolutionQR } from '@/_actions/inbox/get-evolution-qr'
import { sendTestMessage } from '@/_actions/onboarding/send-test-message'
import { skipWhatsapp } from '@/_actions/onboarding/skip-whatsapp'

type Phase = 'initializing' | 'scanning' | 'connected' | 'error' | 'expired'

const POLL_INTERVAL = 5000
const QR_TIMEOUT = 120000

interface WhatsappStepProps {
  onComplete: () => void
  onSkip: () => void
  initialInboxId?: string | null
  onInboxIdChange?: (id: string) => void
}

export function WhatsappStep({
  onComplete,
  onSkip,
  initialInboxId,
  onInboxIdChange,
}: WhatsappStepProps) {
  const [phase, setPhase] = useState<Phase>(
    initialInboxId ? 'scanning' : 'initializing',
  )
  const [inboxId, setInboxId] = useState<string | null>(initialInboxId ?? null)
  const [qrBase64, setQrBase64] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [testPhone, setTestPhone] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasInitialized = useRef(!!initialInboxId)

  const { execute: executeSetup } = useAction(setupWhatsapp, {
    onSuccess: ({ data }) => {
      if (!data) return
      setInboxId(data.inboxId)
      onInboxIdChange?.(data.inboxId)
      if (data.qrBase64) setQrBase64(data.qrBase64)
      setPhase('scanning')
    },
    onError: ({ error }) => {
      setErrorMessage(error.serverError || 'Erro ao configurar WhatsApp.')
      setPhase('error')
    },
  })

  const { execute: executeGetQR } = useAction(getEvolutionQR, {
    onSuccess: ({ data }) => {
      if (!data) return

      if (data.state === 'open') {
        setPhase('connected')
        setQrBase64(null)
        setQrCode(null)
        setPairingCode(null)
        stopPolling()
        return
      }

      setQrBase64(data.base64 ?? null)
      setQrCode(data.code ?? null)
      setPairingCode(data.pairingCode ?? null)
    },
    onError: () => {
      // Silenciosamente ignora erros de polling
    },
  })

  const { execute: executeSendTest, isPending: isSendingTest } = useAction(
    sendTestMessage,
    {
      onSuccess: () => {
        toast.success('Mensagem de teste enviada!')
        setTestPhone('')
      },
      onError: ({ error }) => {
        const validationMessage =
          error.validationErrors?.phoneNumber?._errors?.[0]
        toast.error(
          error.serverError ||
            validationMessage ||
            'Erro ao enviar mensagem de teste.',
        )
      },
    },
  )

  const { execute: executeSkip, isPending: isSkipping } = useAction(
    skipWhatsapp,
    {
      onSuccess: () => {
        onSkip()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao pular etapa.')
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
    if (!inboxId) return
    stopPolling()

    executeGetQR({ inboxId })

    pollRef.current = setInterval(() => {
      executeGetQR({ inboxId })
    }, POLL_INTERVAL)

    timeoutRef.current = setTimeout(() => {
      stopPolling()
      setQrBase64(null)
      setQrCode(null)
      setPairingCode(null)
      setPhase('expired')
    }, QR_TIMEOUT)
  }, [inboxId, executeGetQR, stopPolling])

  // Auto-inicializa na montagem
  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true
    executeSetup({})
  }, [executeSetup])

  // Inicia polling quando entra em scanning com inboxId
  useEffect(() => {
    if (phase === 'scanning' && inboxId) {
      startPolling()
    }

    return () => stopPolling()
  }, [phase, inboxId, startPolling, stopPolling])

  const handleRetry = () => {
    setErrorMessage(null)
    setPhase('initializing')
    executeSetup({})
  }

  const handleSkip = () => {
    executeSkip({})
  }

  const handleSendTest = () => {
    if (isSendingTest || !testPhone.trim()) return
    executeSendTest({ phoneNumber: testPhone.trim() })
  }

  // Fase: Inicializando
  if (phase === 'initializing') {
    return (
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Conecte seu WhatsApp
        </h2>
        <p className="text-muted-foreground">
          Preparando sua conexão...
        </p>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  // Fase: Erro
  if (phase === 'error') {
    return (
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Conecte seu WhatsApp
        </h2>
        <p className="text-destructive">
          {errorMessage || 'Ocorreu um erro inesperado.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button onClick={handleRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            {isSkipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pular esta etapa
          </Button>
        </div>
      </div>
    )
  }

  // Fase: QR Expirado
  if (phase === 'expired') {
    return (
      <div className="mx-auto max-w-4xl space-y-4 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Conecte seu WhatsApp
        </h2>
        <p className="text-muted-foreground">
          O QR code expirou. Gere um novo para continuar.
        </p>
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            onClick={() => {
              setPhase('scanning')
              startPolling()
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar novo QR Code
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            {isSkipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pular esta etapa
          </Button>
        </div>
      </div>
    )
  }

  // Fase: Conectado
  if (phase === 'connected') {
    return (
      <div className="mx-auto max-w-4xl space-y-6 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Conecte seu WhatsApp
        </h2>

        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <CheckCircle className="h-12 w-12 text-green-500" />
          </motion.div>
          <p className="text-lg font-medium">WhatsApp conectado com sucesso!</p>
        </div>

        <Card className="mx-auto max-w-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Enviar mensagem de teste
            </CardTitle>
            <CardDescription>
              Opcional: envie uma mensagem para verificar se tudo está
              funcionando.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="(11) 99999-9999"
                value={testPhone}
                onChange={(event) => setTestPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleSendTest()
                }}
              />
              <Button
                onClick={handleSendTest}
                disabled={isSendingTest || !testPhone.trim()}
                size="icon"
              >
                {isSendingTest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Button size="lg" onClick={onComplete}>
          Continuar
        </Button>
      </div>
    )
  }

  // Fase: Scanning (QR Code)
  return (
    <div className="mx-auto max-w-4xl space-y-6 text-center">
      <h2 className="text-2xl font-bold tracking-tight">
        Conecte seu WhatsApp
      </h2>
      <p className="text-muted-foreground">
        Abra o WhatsApp no seu celular, vá em Dispositivos Conectados e
        escaneie o código abaixo.
      </p>

      <div className="flex flex-col items-center gap-4 py-4">
        {qrCode ? (
          <motion.div
            className="rounded-lg border bg-white p-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <QRCodeSVG value={qrCode} size={256} />
          </motion.div>
        ) : qrBase64 ? (
          <motion.div
            className="rounded-lg border bg-white p-4"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
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
          </motion.div>
        ) : pairingCode ? (
          <div className="flex flex-col items-center gap-3 rounded-lg border p-8">
            <p className="text-sm font-medium text-muted-foreground">
              Código de pareamento:
            </p>
            <p className="font-mono text-3xl font-bold tracking-widest">
              {pairingCode}
            </p>
            <p className="max-w-xs text-center text-xs text-muted-foreground">
              No WhatsApp, vá em Configurações &rarr; Dispositivos Conectados
              &rarr; Conectar com número de telefone e insira o código acima.
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

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={startPolling}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Gerar novo QR Code
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={isSkipping}
          >
            {isSkipping && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Pular esta etapa
          </Button>
        </div>
      </div>
    </div>
  )
}
