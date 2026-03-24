'use client'

import { useEffect, useRef, useCallback, useReducer, useState } from 'react'
import {
  AbstractChat,
  DefaultChatTransport,
  type UIMessage,
  type ChatState,
  type ChatStatus,
  type ChatInit,
} from 'ai'
import { type ReactNode } from 'react'
import { Send, Bot, User, Loader2, CheckCircle, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { BusinessProfile } from '@/_lib/onboarding/schemas/business-profile'

const WELCOME_TEXT =
  'Oii! 😊 Eu sou a Kassandra, vou te ajudar a configurar o Kronos pra ficar perfeito pro seu negócio!\n\nPra começar, você tem um site ou Instagram da empresa? Me passa o link que eu já dou uma olhada! Se não tiver, sem problema — me conta o que vocês fazem que a gente conversa 💜'

// Extrai TODOS os textos de uma UIMessage (SDK v6: texto em `parts`)
// Uma mensagem pode ter multiplos text parts (ex: texto antes e depois de tool call)
function extractMessageText(message: UIMessage): string {
  const textParts = message.parts
    .filter((part) => part.type === 'text' && 'text' in part)
    .map((part) => (part as { type: 'text'; text: string }).text)

  return textParts.join('\n\n')
}

// Renderiza texto com suporte a markdown inline basico: **bold** e *italic*
function renderFormattedText(text: string): ReactNode[] {
  return text.split('\n').map((line, lineIndex, lines) => {
    // Processa **bold** e *italic* inline
    const parts: ReactNode[] = []
    let remaining = line
    let partIndex = 0

    while (remaining.length > 0) {
      // **bold**
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      // *italic*
      const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/)

      const firstMatch =
        boldMatch && italicMatch
          ? (boldMatch.index ?? Infinity) <= (italicMatch.index ?? Infinity)
            ? boldMatch
            : italicMatch
          : boldMatch ?? italicMatch

      if (!firstMatch || firstMatch.index === undefined) {
        parts.push(remaining)
        break
      }

      // Texto antes do match
      if (firstMatch.index > 0) {
        parts.push(remaining.slice(0, firstMatch.index))
      }

      // O match formatado
      if (firstMatch === boldMatch) {
        parts.push(
          <strong key={`b-${lineIndex}-${partIndex}`} className="font-semibold">
            {firstMatch[1]}
          </strong>,
        )
      } else {
        parts.push(
          <em key={`i-${lineIndex}-${partIndex}`}>{firstMatch[1]}</em>,
        )
      }

      partIndex++
      remaining = remaining.slice(firstMatch.index + firstMatch[0].length)
    }

    return (
      <span key={lineIndex}>
        {parts}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    )
  })
}

// ---------------------------------------------------------------------------
// Infraestrutura AbstractChat (mesmo padrao do use-test-chat.ts)
// ---------------------------------------------------------------------------

function createProxiedChatState(
  onChangeRef: React.RefObject<() => void>,
): ChatState<UIMessage> {
  const raw: ChatState<UIMessage> = {
    status: 'ready' as ChatStatus,
    error: undefined,
    messages: [] as UIMessage[],

    pushMessage(message: UIMessage) {
      raw.messages = [...raw.messages, message]
      onChangeRef.current?.()
    },

    popMessage() {
      raw.messages = raw.messages.slice(0, -1)
      onChangeRef.current?.()
    },

    replaceMessage(index: number, message: UIMessage) {
      const updated = [...raw.messages]
      updated[index] = message
      raw.messages = updated
      onChangeRef.current?.()
    },

    snapshot<T>(thing: T): T {
      return thing
    },
  }

  return new Proxy(raw, {
    set(target, prop, value) {
      // @ts-expect-error — prop e symbol|string generico, acesso e seguro aqui
      target[prop] = value
      if (prop === 'status' || prop === 'error' || prop === 'messages') {
        onChangeRef.current?.()
      }
      return true
    },
  })
}

class OnboardingChat extends AbstractChat<UIMessage> {
  private readonly proxiedState: ChatState<UIMessage>

  constructor(
    init: Omit<ChatInit<UIMessage>, 'messages'> & {
      state: ChatState<UIMessage>
    },
  ) {
    super(init)
    this.proxiedState = init.state
  }

  getMessages(): UIMessage[] {
    return this.proxiedState.messages
  }

  getStatus(): ChatStatus {
    return this.proxiedState.status
  }

  getError(): Error | undefined {
    return this.proxiedState.error
  }
}

// ---------------------------------------------------------------------------
// Hook useOnboardingChat
// ---------------------------------------------------------------------------

function useOnboardingChat() {
  const [, forceUpdate] = useReducer((count: number) => count + 1, 0)
  const forceUpdateRef = useRef(forceUpdate)
  forceUpdateRef.current = forceUpdate
  const lastTextRef = useRef<string | null>(null)

  const chatRef = useRef<OnboardingChat | null>(null)

  if (chatRef.current === null) {
    const state = createProxiedChatState(forceUpdateRef)

    // Injeta mensagem de boas-vindas como primeira mensagem do assistente
    const welcomeMessage: UIMessage = {
      id: 'welcome',
      role: 'assistant',
      parts: [{ type: 'text', text: WELCOME_TEXT }],
    }
    state.messages = [welcomeMessage]

    chatRef.current = new OnboardingChat({
      id: 'onboarding-chat',
      transport: new DefaultChatTransport({
        api: '/api/onboarding/chat',
      }),
      state,
    })
  }

  const chat = chatRef.current

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      lastTextRef.current = text
      try {
        await chat.sendMessage({ text })
      } catch {
        // Erros sao capturados pelo estado interno do chat
      }
    },
    [chat],
  )

  const retry = useCallback(async () => {
    const lastText = lastTextRef.current
    if (!lastText) return

    try {
      await chat.sendMessage({ text: lastText })
    } catch {
      // Erro recapturado pelo estado interno
    }
  }, [chat])

  return {
    messages: chat.getMessages(),
    isLoading: chat.getStatus() === 'submitted' || chat.getStatus() === 'streaming',
    error: chat.getError(),
    sendMessage,
    retry,
  }
}

// ---------------------------------------------------------------------------
// Componente ConversationStep
// ---------------------------------------------------------------------------

interface ConversationStepProps {
  onComplete: (profile: BusinessProfile) => void
  initialProfile: BusinessProfile | null
}

export function ConversationStep({
  onComplete,
  initialProfile,
}: ConversationStepProps) {
  const [input, setInput] = useState('')
  const [profileDone, setProfileDone] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const profileExtractedRef = useRef(false)

  const { messages, isLoading, error, sendMessage, retry } = useOnboardingChat()

  // Auto-scroll para a ultima mensagem (uso valido: sync com DOM externo)
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]',
    )
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight
    }
  }, [messages])

  // Detecta extracao do BusinessProfile via tool part
  // SDK v6: tool parts tem type='tool-{toolName}' com state e output
  useEffect(() => {
    if (profileExtractedRef.current) return

    for (const message of messages) {
      for (const part of message.parts) {
        // Detecta por type exato ou por prefixo + nome da tool
        const isExtractTool =
          part.type === 'tool-extract_business_profile' ||
          (part.type === 'dynamic-tool' &&
            'toolName' in part &&
            (part as { toolName: string }).toolName === 'extract_business_profile')

        if (!isExtractTool) continue

        // Aceita output em qualquer state que tenha o campo output preenchido
        if ('output' in part && part.output != null) {
          profileExtractedRef.current = true
          setProfileDone(true)
          const profile = part.output as BusinessProfile
          onComplete(profile)
          return
        }

        // Fallback: se tem input disponivel (a tool foi chamada com os dados do profile)
        if (
          'state' in part &&
          (part as { state: string }).state === 'input-available' &&
          'input' in part &&
          part.input != null
        ) {
          profileExtractedRef.current = true
          setProfileDone(true)
          const profile = part.input as BusinessProfile
          onComplete(profile)
          return
        }
      }
    }
  }, [messages, onComplete])

  const handleTextareaChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(event.target.value)
      const el = event.target
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    },
    [],
  )

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    await sendMessage(text)
  }, [input, isLoading, sendMessage])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey && !isLoading) {
        event.preventDefault()
        void handleSend()
      }
    },
    [isLoading, handleSend],
  )

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleSend()
    },
    [handleSend],
  )

  const visibleMessages = messages.filter(
    (msg) => msg.role === 'user' || msg.role === 'assistant',
  )

  return (
    <div className="flex h-full w-full flex-col">
      {/* Banner para perfil ja coletado */}
      <AnimatePresence>
        {initialProfile && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 border-b border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30"
          >
            <CheckCircle className="size-4 shrink-0 text-green-600" />
            <p className="flex-1 text-sm text-green-800 dark:text-green-300">
              Perfil já coletado. Você pode conversar mais ou avançar diretamente.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-400"
              onClick={() => onComplete(initialProfile)}
            >
              Continuar
              <ArrowRight className="ml-1.5 size-3.5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Area de mensagens */}
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Kassandra</span>
          <Badge variant="outline" className="ml-auto text-xs">
            IA
          </Badge>
        </div>

        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
            <AnimatePresence initial={false}>
              {visibleMessages.map((message) => {
                const isAssistant = message.role === 'assistant'
                const text = extractMessageText(message)

                // Nao renderiza mensagens sem texto (ex: mensagens so com tool parts)
                if (!text) return null

                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={cn(
                      'flex gap-2.5',
                      isAssistant ? 'justify-start' : 'flex-row-reverse',
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-full',
                        isAssistant
                          ? 'bg-primary/10 text-primary'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {isAssistant ? (
                        <Bot className="size-4" />
                      ) : (
                        <User className="size-4" />
                      )}
                    </div>
                    <div
                      className={cn(
                        'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                        isAssistant
                          ? 'rounded-tl-sm bg-muted text-foreground'
                          : 'rounded-tr-sm bg-primary text-white',
                      )}
                    >
                      {renderFormattedText(text)}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Erro com botao de retry */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle className="size-4" />
                </div>
                <div className="flex flex-col gap-2 rounded-2xl rounded-tl-sm bg-destructive/10 px-4 py-2.5">
                  <p className="text-sm text-destructive">
                    Ops, algo deu errado. Tente novamente.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void retry()}
                    className="w-fit gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
                  >
                    <RefreshCw className="size-3.5" />
                    Tentar novamente
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Indicador de digitacao */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5"
              >
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:0ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:150ms]" />
                  <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:300ms]" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-3 px-4">
          <form onSubmit={handleFormSubmit} className="mx-auto flex max-w-2xl items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Descreva seu negócio..."
              disabled={isLoading || profileDone}
              rows={1}
              className="min-h-[40px] resize-none overflow-hidden"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading || profileDone}
              className="size-10 shrink-0"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
          <p className="mt-1.5 text-center text-xs text-muted-foreground">
            Pressione Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </div>
  )
}
