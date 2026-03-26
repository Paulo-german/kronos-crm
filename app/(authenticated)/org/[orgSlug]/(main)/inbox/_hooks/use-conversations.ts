'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

const BASE_POLL_INTERVAL_MS = 5_000
const MAX_POLL_INTERVAL_MS = 30_000
const POLL_STEP_MS = 5_000
const DEBOUNCE_MS = 300
const MAX_CONSECUTIVE_FAILURES = 3
const OPTIMISTIC_LOCK_MS = 10_000

interface UseConversationsOptions {
  inboxId: string | null
  unreadOnly: boolean
  unansweredOnly: boolean
  search: string
  contactId: string | null
}

interface DeepLinkContact {
  id: string
  name: string
  phone: string | null
}

interface UseConversationsReturn {
  conversations: ConversationListDto[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  totalCount: number
  totalUnread: number
  totalUnanswered: number
  deepLinkConversationId: string | null
  deepLinkConversation: ConversationListDto | null
  deepLinkContact: DeepLinkContact | null
  connectionError: boolean
  loadMore: () => void
  sentinelRef: (node: HTMLElement | null) => void
  updateConversationLocally: (id: string, partial: Partial<ConversationListDto>) => void
  refetch: () => void
}

interface ApiResponse {
  conversations: ConversationListDto[]
  hasMore: boolean
  totalCount: number
  totalUnread: number
  totalUnanswered: number
  deepLinkConversationId?: string
  deepLinkConversation?: ConversationListDto
  deepLinkContact?: DeepLinkContact
}

function buildUrl(options: UseConversationsOptions, cursor?: string): string {
  const params = new URLSearchParams()
  params.set('limit', '20')
  if (cursor) params.set('cursor', cursor)
  if (options.inboxId) params.set('inboxId', options.inboxId)
  if (options.unreadOnly) params.set('unread', 'true')
  if (options.unansweredOnly) params.set('unanswered', 'true')
  if (options.search) params.set('search', options.search)
  if (options.contactId) params.set('contactId', options.contactId)
  return `/api/inbox/conversations?${params.toString()}`
}

export function useConversations(options: UseConversationsOptions): UseConversationsReturn {
  const { inboxId, unreadOnly, unansweredOnly, search, contactId } = options

  const [conversations, setConversations] = useState<ConversationListDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [totalUnread, setTotalUnread] = useState(0)
  const [totalUnanswered, setTotalUnanswered] = useState(0)
  const [deepLinkConversationId, setDeepLinkConversationId] = useState<string | null>(null)
  const [deepLinkConversation, setDeepLinkConversation] = useState<ConversationListDto | null>(null)
  const [deepLinkContact, setDeepLinkContact] = useState<DeepLinkContact | null>(null)

  const [debouncedSearch, setDebouncedSearch] = useState(search)
  const [connectionError, setConnectionError] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)
  const didDeepLink = useRef(false)
  const cursorRef = useRef<string | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const failCountRef = useRef(0)

  // Polling adaptativo: intervalo aumenta quando idle, reseta quando há mudanças
  const pollIntervalRef = useRef(BASE_POLL_INTERVAL_MS)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastDataHashRef = useRef('')
  // Optimistic lock: protege conversas com update otimista recente do merge do polling
  const optimisticLockRef = useRef<Map<string, number>>(new Map())

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch first page (on filter change)
  const fetchFirstPage = useCallback(async (signal?: AbortSignal) => {
    const fetchContactId = !didDeepLink.current ? contactId : null
    const url = buildUrl(
      { inboxId, unreadOnly, unansweredOnly, search: debouncedSearch, contactId: fetchContactId },
    )

    try {
      const response = await fetch(url, { signal })
      if (!response.ok || signal?.aborted) return null
      const data: ApiResponse = await response.json()

      if (data.deepLinkConversationId) {
        setDeepLinkConversationId(data.deepLinkConversationId)
        if (data.deepLinkConversation) {
          setDeepLinkConversation(data.deepLinkConversation)
        }
        didDeepLink.current = true
      } else if (data.deepLinkContact) {
        setDeepLinkContact(data.deepLinkContact)
        didDeepLink.current = true
      }

      return data
    } catch {
      return null
    }
  }, [inboxId, unreadOnly, unansweredOnly, debouncedSearch, contactId])

  // Initial fetch + reset on filter change
  useEffect(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setIsLoading(true)
    cursorRef.current = undefined

    fetchFirstPage(controller.signal).then((data) => {
      if (controller.signal.aborted) return
      if (!data) {
        failCountRef.current += 1
        if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
          setConnectionError(true)
        }
        setIsLoading(false)
        return
      }
      failCountRef.current = 0
      setConnectionError(false)
      setConversations(data.conversations)
      setHasMore(data.hasMore)
      setTotalCount(data.totalCount)
      setTotalUnread(data.totalUnread)
      setTotalUnanswered(data.totalUnanswered ?? 0)
      cursorRef.current = data.conversations.at(-1)?.id
      setIsLoading(false)
    })

    return () => controller.abort()
  }, [fetchFirstPage])

  // Função de polling reutilizável (chamada pelo timer e pelo refetch)
  const pollConversations = useCallback(async () => {
    const url = buildUrl({ inboxId, unreadOnly, unansweredOnly, search: debouncedSearch, contactId: null })
    try {
      const response = await fetch(url)
      if (!response.ok) return
      const data: ApiResponse = await response.json()

      // Hash simples para detectar mudanças (adaptar intervalo)
      const dataHash = JSON.stringify(data.conversations.map((conv) => `${conv.id}:${conv.unreadCount}:${conv.lastMessageRole}:${conv.updatedAt}`))
      const hasChanges = dataHash !== lastDataHashRef.current
      lastDataHashRef.current = dataHash

      // Intervalo adaptativo: reseta para base se há mudanças, aumenta se idle
      if (hasChanges) {
        pollIntervalRef.current = BASE_POLL_INTERVAL_MS
      } else {
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current + POLL_STEP_MS,
          MAX_POLL_INTERVAL_MS,
        )
      }

      setConversations((prev) => {
        const now = Date.now()
        const merged = new Map<string, ConversationListDto>()
        for (const conv of prev) merged.set(conv.id, conv)
        for (const conv of data.conversations) {
          const lockedAt = optimisticLockRef.current.get(conv.id)
          // Pular conversas com lock ativo (update otimista recente)
          if (lockedAt && now - lockedAt < OPTIMISTIC_LOCK_MS) continue
          merged.set(conv.id, conv)
        }
        // Limpar locks expirados
        for (const [id, lockedAt] of optimisticLockRef.current) {
          if (now - lockedAt >= OPTIMISTIC_LOCK_MS) {
            optimisticLockRef.current.delete(id)
          }
        }
        return Array.from(merged.values()).sort(
          (convA, convB) =>
            new Date(convB.updatedAt).getTime() - new Date(convA.updatedAt).getTime(),
        )
      })
      setTotalCount(data.totalCount)
      setTotalUnread(data.totalUnread)
      setTotalUnanswered(data.totalUnanswered ?? 0)
      failCountRef.current = 0
      setConnectionError(false)
    } catch {
      failCountRef.current += 1
      if (failCountRef.current >= MAX_CONSECUTIVE_FAILURES) {
        setConnectionError(true)
      }
    }
  }, [inboxId, unreadOnly, unansweredOnly, debouncedSearch])

  // Polling adaptativo com setTimeout recursivo (permite mudar o intervalo dinamicamente)
  useEffect(() => {
    let cancelled = false

    const schedulePoll = () => {
      pollTimerRef.current = setTimeout(async () => {
        if (cancelled) return
        await pollConversations()
        if (!cancelled) schedulePoll()
      }, pollIntervalRef.current)
    }

    // Reseta intervalo quando filtros mudam
    pollIntervalRef.current = BASE_POLL_INTERVAL_MS
    schedulePoll()

    return () => {
      cancelled = true
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    }
  }, [pollConversations])

  // Pause polling quando a tab está inativa, re-fetch imediato ao voltar
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pausar polling
        if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
      } else {
        // Tab voltou: re-fetch imediato e reiniciar polling
        pollIntervalRef.current = BASE_POLL_INTERVAL_MS
        pollConversations()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [pollConversations])

  // Re-fetch imediato (chamado após actions para garantir dados frescos)
  const refetch = useCallback(() => {
    // Reseta intervalo para base (algo mudou)
    pollIntervalRef.current = BASE_POLL_INTERVAL_MS
    // Cancela timer pendente e faz fetch imediato
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current)
    pollConversations()
  }, [pollConversations])

  // Load more (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !cursorRef.current) return

    setIsLoadingMore(true)
    const url = buildUrl(
      { inboxId, unreadOnly, unansweredOnly, search: debouncedSearch, contactId: null },
      cursorRef.current,
    )

    try {
      const response = await fetch(url)
      if (!response.ok) return
      const data: ApiResponse = await response.json()

      setConversations((prev) => {
        const merged = new Map<string, ConversationListDto>()
        for (const conv of prev) merged.set(conv.id, conv)
        for (const conv of data.conversations) merged.set(conv.id, conv)
        return Array.from(merged.values()).sort(
          (convA, convB) =>
            new Date(convB.updatedAt).getTime() - new Date(convA.updatedAt).getTime(),
        )
      })
      setHasMore(data.hasMore)
      cursorRef.current = data.conversations.at(-1)?.id
    } catch {
      // Silently ignore
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, inboxId, unreadOnly, unansweredOnly, debouncedSearch])

  // Optimistic update: atualiza uma conversa localmente e registra lock
  // para proteger do merge do polling por OPTIMISTIC_LOCK_MS
  const updateConversationLocally = useCallback(
    (id: string, partial: Partial<ConversationListDto>) => {
      optimisticLockRef.current.set(id, Date.now())
      setConversations((prev) =>
        prev.map((conv) => (conv.id === id ? { ...conv, ...partial } : conv)),
      )
    },
    [],
  )

  // IntersectionObserver sentinel ref callback
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      if (!node) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            loadMore()
          }
        },
        { threshold: 0.1 },
      )
      observerRef.current.observe(node)
    },
    [loadMore],
  )

  return {
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    totalUnread,
    totalUnanswered,
    deepLinkConversationId,
    deepLinkConversation,
    deepLinkContact,
    connectionError,
    loadMore,
    sentinelRef,
    updateConversationLocally,
    refetch,
  }
}
