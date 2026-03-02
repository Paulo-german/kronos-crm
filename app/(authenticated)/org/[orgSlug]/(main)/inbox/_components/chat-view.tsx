'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type KeyboardEvent,
} from 'react'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { CircleIcon, Loader2, Mic, Pause, Send, Square, Trash2, AlertTriangle } from 'lucide-react'
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
import { sendAudio } from '@/_actions/inbox/send-audio'
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
  const [pausedAt, setPausedAt] = useState<Date | string | null>(conversation.pausedAt)
  const [text, setText] = useState('')
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingDuration, setRecordingDuration] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)
  // Rastreia toggle in-flight para evitar que polling sobrescreva estado otimista
  const togglePendingRef = useRef<boolean | null>(null)

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
      const wasPaused = togglePendingRef.current
      togglePendingRef.current = null
      toast.success(wasPaused ? 'IA pausada' : 'IA reativada')
    },
    onError: (error) => {
      if (togglePendingRef.current !== null) {
        setAiPaused(!togglePendingRef.current)
      }
      togglePendingRef.current = null
      toast.error(error.error?.serverError ?? 'Erro ao alterar estado da IA')
    },
  })

  const sendAudioAction = useAction(sendAudio, {
    onSuccess: () => {
      fetchMessages()
    },
    onError: (error) => {
      toast.error(error.error?.serverError ?? 'Erro ao enviar áudio')
    },
  })

  // Fetch messages (load inicial + polling)
  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/inbox/${conversation.id}/messages`,
      )
      if (!response.ok) return

      const data = await response.json()

      setMessages((prev) => {
        // Load inicial: setar direto
        if (prev.length === 0) {
          setHasMore(data.hasMore)
          return data.messages
        }

        // Polling: merge via Map para preservar mensagens antigas carregadas pelo "load more"
        const merged = new Map<string, MessageDto>()
        for (const message of prev) {
          merged.set(message.id, message)
        }
        for (const message of data.messages) {
          merged.set(message.id, message)
        }
        return Array.from(merged.values()).sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      })

      // Só sincroniza aiPaused do servidor se não há toggle pendente
      if (togglePendingRef.current === null) {
        setAiPaused(data.aiPaused)
        setPausedAt(data.pausedAt ?? null)
      }
      setIsLoadingMessages(false)
    } catch {
      // Silencioso em polling
    }
  }, [conversation.id])

  // Scroll to bottom apenas quando a última mensagem muda (nova mensagem no final)
  // Não dispara ao carregar mensagens anteriores (prepend), pois o último ID não muda
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null
    if (lastId && lastId !== lastMessageIdRef.current) {
      scrollToBottom()
    }
    lastMessageIdRef.current = lastId
  }, [messages])

  // Initial fetch + polling
  useEffect(() => {
    setIsLoadingMessages(true)
    setMessages([])
    setHasMore(false)
    lastMessageIdRef.current = null
    fetchMessages()

    const interval = setInterval(fetchMessages, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Sync aiPaused when conversation prop changes
  useEffect(() => {
    setAiPaused(conversation.aiPaused)
    setPausedAt(conversation.pausedAt)
  }, [conversation.aiPaused, conversation.pausedAt])

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const loadOlderMessages = useCallback(async () => {
    if (!messages.length || isLoadingMore) return

    const oldestId = messages[0].id
    const viewport = scrollAreaRef.current?.querySelector(
      '[data-radix-scroll-area-viewport]',
    ) as HTMLElement | null
    const prevScrollHeight = viewport?.scrollHeight ?? 0

    setIsLoadingMore(true)
    try {
      const response = await fetch(
        `/api/inbox/${conversation.id}/messages?cursor=${oldestId}`,
      )
      if (!response.ok) return

      const data = await response.json()
      setHasMore(data.hasMore)
      setMessages((prev) => [...data.messages, ...prev])

      // Preservar posição do scroll após prepend
      requestAnimationFrame(() => {
        if (viewport) {
          const newScrollHeight = viewport.scrollHeight
          viewport.scrollTop = newScrollHeight - prevScrollHeight
        }
      })
    } catch {
      // Silencioso
    } finally {
      setIsLoadingMore(false)
    }
  }, [messages, isLoadingMore, conversation.id])

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
    togglePendingRef.current = newPaused
    toggleAction.execute({
      conversationId: conversation.id,
      aiPaused: newPaused,
    })
  }

  const clearRecordingTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : undefined

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        // Parar todas as tracks do microfone
        stream.getTracks().forEach((track) => track.stop())

        // Se foi cancelado (ex: troca de conversa), não envia
        if (cancelledRef.current) {
          cancelledRef.current = false
          return
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        const duration = (Date.now() - recordingStartRef.current) / 1000

        if (blob.size === 0) return

        const reader = new FileReader()
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1]
          sendAudioAction.execute({
            conversationId: conversation.id,
            audioBase64: base64,
            duration,
          })
        }
        reader.readAsDataURL(blob)
      }

      cancelledRef.current = false
      recordingStartRef.current = Date.now()
      setRecordingDuration(0)
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - recordingStartRef.current) / 1000))
      }, 1000)

      recorder.start()
      setIsRecording(true)
    } catch {
      toast.error('Não foi possível acessar o microfone. Verifique as permissões do navegador.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    clearRecordingTimer()
    setIsRecording(false)
    setRecordingDuration(0)
  }

  const cancelRecording = () => {
    cancelledRef.current = true
    stopRecording()
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Cancelar gravação ao trocar de conversa
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        cancelledRef.current = true
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current.stop()
      }
      clearRecordingTimer()
    }
  }, [conversation.id])

  // Expandir mensagens da AI em chunks separados (mesma lógica do WhatsApp: split por \n\n)
  const displayMessages = useMemo(() => {
    const result: MessageDto[] = []
    for (const message of messages) {
      const meta = message.metadata as Record<string, unknown> | null
      const isAiGenerated = message.role === 'assistant' && !!meta?.model

      if (isAiGenerated) {
        const chunks = message.content
          .split(/\n\n+/)
          .map((chunk) => chunk.trim())
          .filter(Boolean)

        if (chunks.length > 1) {
          for (let index = 0; index < chunks.length; index++) {
            result.push({
              ...message,
              id: `${message.id}-${index}`,
              content: chunks[index],
            })
          }
          continue
        }
      }

      result.push(message)
    }
    return result
  }, [messages])

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
          <div className="flex items-center gap-2 border-b border-kronos-yellow/20 bg-kronos-yellow/10 px-4 py-2 text-xs text-kronos-yellow">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              IA pausada. Você está no controle da conversa.{' '}
              {pausedAt
                ? 'A IA será reativada automaticamente após 30 minutos sem interação ou ao ativar o switch.'
                : 'Reative manualmente pelo switch acima.'}
            </span>
          </div>
        )}

        {/* Mensagens */}
        <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
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

            {hasMore && !isLoadingMessages && (
              <div className="flex justify-center pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadOlderMessages}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Carregar anteriores
                </Button>
              </div>
            )}

            {displayMessages.map((message) => (
              <MessageBubble
                key={message.id}
                id={message.id}
                conversationId={conversation.id}
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
            {isRecording ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={cancelRecording}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Cancelar gravação</p>
                  </TooltipContent>
                </Tooltip>
                <div className="flex flex-1 items-center gap-3 rounded-md border px-4 py-2">
                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {formatDuration(recordingDuration)}
                  </span>
                </div>
              </>
            ) : (
              <Textarea
                ref={textareaRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite uma mensagem..."
                className="max-h-[120px] min-h-[44px] resize-none"
                rows={1}
                disabled={sendAction.isPending || sendAudioAction.isPending}
              />
            )}
            {isRecording ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={stopRecording}
                    className="shrink-0"
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Parar gravação</p>
                </TooltipContent>
              </Tooltip>
            ) : text.trim() ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={sendAction.isPending}
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
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    onClick={startRecording}
                    disabled={sendAudioAction.isPending}
                    className="shrink-0"
                  >
                    {sendAudioAction.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Gravar áudio</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
