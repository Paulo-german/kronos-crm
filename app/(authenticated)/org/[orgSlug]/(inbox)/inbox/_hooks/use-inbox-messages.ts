'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MessageDto } from '../_components/chat-types'
import type { ConversationEventDto } from '@/_lib/conversation-events/types'
import { inboxKeys } from '../_lib/inbox-query-keys'

export interface MessagesApiResponse {
  messages: MessageDto[]
  events: ConversationEventDto[]
  hasMore: boolean
  aiPaused: boolean
  pausedAt: string | null
}

interface UseInboxMessagesOptions {
  conversationId: string
}

interface UseInboxMessagesReturn {
  messages: MessageDto[]
  events: ConversationEventDto[]
  aiPaused: boolean
  pausedAt: string | null
  isLoadingMessages: boolean
  hasMore: boolean
  isLoadingMore: boolean
  connectionError: boolean
  loadOlderMessages: () => Promise<void>
  scrollRef: React.RefObject<HTMLDivElement | null>
  scrollAreaRef: React.RefObject<HTMLDivElement | null>
}

export function useInboxMessages({ conversationId }: UseInboxMessagesOptions): UseInboxMessagesReturn {
  // Mensagens antigas carregadas via cursor (load older)
  const [olderMessages, setOlderMessages] = useState<MessageDto[]>([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const lastMessageIdRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const query = useQuery({
    queryKey: inboxKeys.messages.byConversation(conversationId),
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/inbox/${conversationId}/messages`, { signal })
      if (!response.ok) throw new Error('Failed to fetch messages')
      return response.json() as Promise<MessagesApiResponse>
    },
    refetchInterval: 5_000,
    // Pausa o polling quando a aba está em background para economizar recursos
    refetchIntervalInBackground: false,
  })

  // Reset das mensagens antigas ao trocar de conversa para evitar dados de outra conversa
  useEffect(() => {
    setOlderMessages([])
    lastMessageIdRef.current = null
  }, [conversationId])

  // Merge: mensagens antigas (cursor) + mensagens recentes (query), deduplicadas por id, ordenadas ASC
  const messages = useMemo(() => {
    const map = new Map<string, MessageDto>()
    for (const message of olderMessages) map.set(message.id, message)
    for (const message of query.data?.messages ?? []) map.set(message.id, message)
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }, [olderMessages, query.data?.messages])

  // Merge de events, deduplicado por id e ordenado ASC
  const events = useMemo(() => {
    const map = new Map<string, ConversationEventDto>()
    for (const event of query.data?.events ?? []) map.set(event.id, event)
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
  }, [query.data?.events])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  // Scroll para o final apenas quando chega uma nova mensagem (id diferente do último)
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null
    if (lastId && lastId !== lastMessageIdRef.current) {
      scrollToBottom()
    }
    lastMessageIdRef.current = lastId
  }, [messages, scrollToBottom])

  // Carrega mensagens mais antigas via cursor e preserva posição do scroll após prepend
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
        `/api/inbox/${conversationId}/messages?cursor=${oldestId}`,
      )
      if (!response.ok) return
      const data = (await response.json()) as MessagesApiResponse
      setOlderMessages((prev) => [...data.messages, ...prev])

      // Ajusta o scrollTop para que o usuário permaneça na mesma posição visual após o prepend
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight - prevScrollHeight
        }
      })
    } catch {
      // Silencioso — falha não exige feedback visual, o usuário pode tentar novamente
    } finally {
      setIsLoadingMore(false)
    }
  }, [messages, isLoadingMore, conversationId])

  return {
    messages,
    events,
    aiPaused: query.data?.aiPaused ?? false,
    pausedAt: query.data?.pausedAt ?? null,
    isLoadingMessages: query.isLoading,
    hasMore: query.data?.hasMore ?? false,
    isLoadingMore,
    // Só sinaliza erro de conexão após 3 tentativas consecutivas para evitar flash prematuro
    connectionError: query.isError && query.failureCount >= 3,
    loadOlderMessages,
    scrollRef,
    scrollAreaRef,
  }
}
