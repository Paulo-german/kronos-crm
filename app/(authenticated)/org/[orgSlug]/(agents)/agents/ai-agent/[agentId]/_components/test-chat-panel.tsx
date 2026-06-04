'use client'

import { useEffect, useRef, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { X, RotateCcw, Beaker } from 'lucide-react'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { resetTestChat } from '@/_actions/agent/reset-test-chat'
import { useTestChat } from '../_hooks/use-test-chat'
import TestChatMessages from './test-chat-messages'
import TestChatInput from './test-chat-input'
import TestChatEmptyState from './test-chat-empty-state'
import TestChatNoCredits from './test-chat-no-credits'

interface TestChatPanelProps {
  agentId: string
  agentName: string
  configVersion: number
  orgSlug: string
  onClose: () => void
}

const TestChatPanel = ({
  agentId,
  agentName,
  configVersion,
  orgSlug,
  onClose,
}: TestChatPanelProps) => {
  const [hasNoCredits, setHasNoCredits] = useState(false)

  const { messages, isLoading, input, setInput, sendMessage, clearMessages } =
    useTestChat({
      agentId,
      onError: (error) => {
        // Detecta erro de créditos insuficientes retornado pela API (status 402)
        if (
          error.message.includes('NO_CREDITS') ||
          error.message.includes('402')
        ) {
          setHasNoCredits(true)
          return
        }
        toast.error('Erro ao enviar mensagem. Tente novamente.')
      },
    })

  const { execute: executeReset, isPending: isResetting } = useAction(
    resetTestChat,
    {
      onSuccess: () => {
        // Silencioso — o reset do cliente já foi feito antes de chamar a action
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao resetar conversa.')
      },
    },
  )

  // Observa configVersion para auto-reset quando alguma tab salva configuração
  const prevConfigVersionRef = useRef(configVersion)

  useEffect(() => {
    if (configVersion !== prevConfigVersionRef.current) {
      prevConfigVersionRef.current = configVersion
      handleReset()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configVersion])

  const handleReset = () => {
    // Limpa UI imediatamente para feedback instantâneo
    clearMessages()
    setInput('')
    setHasNoCredits(false)
    // Limpa servidor assincronamente
    executeReset({ agentId })
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const textToSend = input
    setInput('')
    await sendMessage(textToSend)
  }

  const hasMessages = messages.some(
    (msg) => msg.role === 'user' || msg.role === 'assistant',
  )

  return (
    <TooltipProvider>
      <div className="flex h-full w-[400px] shrink-0 flex-col border-l border-border/60 bg-background pt-10">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Beaker className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-1 items-center gap-2 overflow-hidden">
            <span className="truncate text-sm font-semibold">{agentName}</span>
            <Badge
              variant="outline"
              className="border-[var(--kronos-cyan)]/30 bg-[var(--kronos-cyan)]/5 shrink-0 text-[10px] font-medium text-[var(--kronos-cyan)]"
            >
              Teste
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {/* Botão reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={handleReset}
                  disabled={isResetting || isLoading}
                  aria-label="Resetar conversa"
                >
                  <RotateCcw
                    className={`h-3.5 w-3.5 ${isResetting ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Resetar conversa</p>
              </TooltipContent>
            </Tooltip>

            {/* Botão fechar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                  aria-label="Fechar painel de teste"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Fechar</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Área de mensagens */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {hasNoCredits ? (
            <TestChatNoCredits orgSlug={orgSlug} />
          ) : !hasMessages ? (
            <TestChatEmptyState />
          ) : (
            <TestChatMessages messages={messages} isLoading={isLoading} />
          )}
        </div>

        {/* Input */}
        {!hasNoCredits && (
          <TestChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            isLoading={isLoading}
            disabled={isResetting}
          />
        )}
      </div>
    </TooltipProvider>
  )
}

export default TestChatPanel
