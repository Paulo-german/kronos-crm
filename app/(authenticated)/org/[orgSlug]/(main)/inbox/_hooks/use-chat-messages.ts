'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MessageDto } from '../_components/chat-types'
import type { ConversationEventDto } from '@/_lib/conversation-events/types'

const POLLING_INTERVAL_MS = 5_000
const MAX_CONSECUTIVE_FAILURES = 3

interface UseChatMessagesOptions {
  conversationId: string
  initialAiPaused: boolean
  initialPausedAt: Date | string | null
}

export function useChatMessages({
  conversationId,
  initialAiPaused,
  initialPausedAt,
}: UseChatMessagesOptions) {
  const [messages, setMessages] = useState<MessageDto[]>([])
  const [events, setEvents] = useState<ConversationEventDto[]>([])
  const [aiPaused, setAiPaused] = useState(initialAiPaused)
  const [pausedAt, setPausedAt] = useState<Date | string | null>(initialPausedAt)
  const [isLoadingMessages, setIsLoadingMessages] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)
  const togglePendingRef = useRef<boolean | null>(null)
  const failCountRef = useRef(0)
  const connectionErrorRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/inbox/${conversationId}/messages`)
      if (!response.ok) return

      const data = await response.json()

      setMessages((prev) => {
        if (prev.length === 0) {
          setHasMore(data.hasMore)
          return data.messages
        }

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

      if (data.events) {
        setEvents((prev) => {
          const merged = new Map<string, ConversationEventDto>()
          for (const event of prev) {
            merged.set(event.id, event)
          }
          for (const event of data.events) {
            merged.set(event.id, event)
          }
          return Array.from(merged.values()).sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
        })
      }

      // Só sincroniza aiPaused do servidor se não há toggle pendente
      if (togglePendingRef.current === null) {
        setAiPaused(data.aiPaused)
        setPausedAt(data.pausedAt ?? null)
      }
      setIsLoadingMessages(false)
      failCountRef.current = 0
      if (connectionErrorRef.current) {
        connectionErrorRef.current = false
        setConnectionError(false)
      }
    } catch {
      failCountRef.current += 1
      if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES && !connectionErrorRef.current) {
        connectionErrorRef.current = true
        setConnectionError(true)
      }
    }
  }, [conversationId])

  // Scroll to bottom apenas quando a última mensagem muda
  useEffect(() => {
    const lastId = messages.at(-1)?.id ?? null
    if (lastId && lastId !== lastMessageIdRef.current) {
      scrollToBottom()
    }
    lastMessageIdRef.current = lastId
  }, [messages, scrollToBottom])

  // Initial fetch + polling
  useEffect(() => {
    setIsLoadingMessages(true)
    setMessages([])
    setEvents([])
    setHasMore(false)
    lastMessageIdRef.current = null
    failCountRef.current = 0
    connectionErrorRef.current = false
    setConnectionError(false)
    fetchMessages()

    const interval = setInterval(fetchMessages, POLLING_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchMessages])

  // Sync aiPaused when conversation prop changes
  useEffect(() => {
    setAiPaused(initialAiPaused)
    setPausedAt(initialPausedAt)
  }, [initialAiPaused, initialPausedAt])

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
  }, [messages, isLoadingMore, conversationId])

  return {
    messages,
    events,
    aiPaused,
    pausedAt,
    isLoadingMessages,
    hasMore,
    isLoadingMore,
    connectionError,
    setAiPaused,
    togglePendingRef,
    fetchMessages,
    loadOlderMessages,
    scrollRef,
    scrollAreaRef,
  }
}
