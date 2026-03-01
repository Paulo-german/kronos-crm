'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { CircleIcon, Pause, Send, Loader2, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { Separator } from '@/_components/ui/separator'
import { Switch } from '@/_components/ui/switch'
import { Textarea } from '@/_components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { MessageBubble } from './message-bubble'
import { sendMessage } from '@/_actions/inbox/send-message'
import { toggleAiPause } from '@/_actions/inbox/toggle-ai-pause'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface MessageDto {
  id: string
  role: string
  content: string
  metadata: unknown
  createdAt: Date | string
}

interface ChatViewProps {
  conversation: ConversationListDto
}

const POLLING_INTERVAL_MS = 5_000

export function ChatView({ conversation }: ChatViewProps) {
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [aiPaused, setAiPaused] = useState(conversation.aiPaused)
  const [text, setText] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageCountRef = useRef(0)

  // Actions
  const sendAction = useAction(sendMessage, {
    onSuccess: () => {
      setText('')
      textareaRef.current?.focus()
      fetchMessages()
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar mensagem')
    },
  })

  const toggleAction = useAction(toggleAiPause, {
    onSuccess: () => {
      toast.success(aiPaused ? 'IA reativada' : 'IA pausada')
    },
    onError: (error) => {
      setAiPaused(!aiPaused)
      toast.error(error.error?.serverError ?? 'Erro ao alterar estado da IA')
    },
  })

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/inbox/${conversation.id}/messages`,
      )
      if (!response.ok) return

      const data = await response.json()
      setMessages(data.messages)
      setAiPaused(data.aiPaused)
      setIsLoadingMessages(false)
    } catch {
      // Silencioso em polling
    }
  }, [conversation.id])

  // Scroll to bottom quando novas mensagens chegam
  useEffect(() => {
    if (messages.length > lastMessageCountRef.current) {
      scrollToBottom()
    }
    lastMessageCountRef.current = messages.length
  }, [messages.length])

  // Initial fetch + polling
  useEffect(() => {
    setIsLoadingMessages(true)
    setMessages([])
    lastMessageCountRef.current = 0
    fetchMessages()

    const interval = setInterval(fetchMessages, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Sync aiPaused when conversation prop changes
  useEffect(() => {
    setAiPaused(conversation.aiPaused)
  }, [conversation.aiPaused])

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || sendAction.isPending) return

    sendAction.execute({
      conversationId: conversation.id,
      text: trimmed,
    })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const handleToggleAi = (checked: boolean) => {
    const newPaused = !checked
    setAiPaused(newPaused)
    toggleAction.execute({
      conversationId: conversation.id,
      aiPaused: newPaused,
    })
  }

  const initials = conversation.contactName
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage />
              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight">
                  {conversation.contactName}
                </span>
                {conversation.agentName && (
                  <Badge
                    variant="outline"
                    className="h-5 border-kronos-purple/20 bg-kronos-purple/10 text-[10px] text-kronos-purple"
                  >
                    {conversation.agentName}
                  </Badge>
                )}
                {aiPaused ? (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-kronos-yellow/20 bg-kronos-yellow/10 px-1.5 text-[10px] text-kronos-yellow"
                  >
                    <Pause className="h-3 w-3" />
                    Pausada
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 border-kronos-green/20 bg-kronos-green/10 px-1.5 text-[10px] text-kronos-green"
                  >
                    <CircleIcon className="h-2 w-2 fill-current" />
                    Ativa
                  </Badge>
                )}
              </div>
              {conversation.contactPhone && (
                <p className="text-xs text-muted-foreground">
                  {conversation.contactPhone}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="ai-toggle"
                    className="cursor-pointer text-xs text-muted-foreground"
                  >
                    IA
                  </Label>
                  <Switch
                    id="ai-toggle"
                    checked={!aiPaused}
                    onCheckedChange={handleToggleAi}
                    disabled={toggleAction.isPending}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{aiPaused ? 'Reativar respostas automáticas da IA' : 'Pausar IA para assumir a conversa manualmente'}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Banner de pausa */}
        {aiPaused && (
          <div className="flex items-center gap-2 border-b border-kronos-yellow/20 bg-kronos-yellow/10 px-4 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-kronos-yellow" />
            <p className="text-xs text-kronos-yellow">
              IA pausada. Você está no controle da conversa. A IA será reativada
              automaticamente após 30 minutos sem interação ou ao ativar o switch.
            </p>
          </div>
        )}

        {/* Mensagens */}
        <ScrollArea className="flex-1 px-4">
          <div className="space-y-3 py-4">
            {isLoadingMessages && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoadingMessages && messages.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma mensagem nesta conversa
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                role={message.role}
                content={message.content}
                metadata={message.metadata}
                createdAt={message.createdAt}
              />
            ))}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <Separator />
        <div className="p-4">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem..."
              className="max-h-[120px] min-h-[44px] resize-none"
              rows={1}
              disabled={sendAction.isPending}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={!text.trim() || sendAction.isPending}
                  className="shrink-0"
                >
                  {sendAction.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Enviar mensagem</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
