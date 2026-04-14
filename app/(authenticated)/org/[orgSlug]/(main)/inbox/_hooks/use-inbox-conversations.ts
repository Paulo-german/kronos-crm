'use client'

import { useMemo, useCallback, useRef, useEffect, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import { inboxKeys } from '../_lib/inbox-query-keys'

const DEBOUNCE_MS = 300

export interface UseConversationsOptions {
  inboxId: string | null
  unreadOnly: boolean
  unansweredOnly: boolean
  search: string
  contactId: string | null
  status: 'OPEN' | 'RESOLVED'
  labelIds: string[]
  assigneeIds: string[]
}

interface DeepLinkContact {
  id: string
  name: string
  phone: string | null
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

export interface UseInboxConversationsReturn {
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
  sentinelRef: (node: HTMLElement | null) => void
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
  if (options.status) params.set('status', options.status)
  if (options.labelIds.length > 0) params.set('labelIds', options.labelIds.join(','))
  if (options.assigneeIds.length > 0) params.set('assigneeIds', options.assigneeIds.join(','))
  return `/api/inbox/conversations?${params.toString()}`
}

export function useInboxConversations(options: UseConversationsOptions): UseInboxConversationsReturn {
  const { inboxId, unreadOnly, unansweredOnly, search, contactId, status, labelIds, assigneeIds } = options

  // Debounce da busca para não disparar query a cada keystroke
  const [debouncedSearch, setDebouncedSearch] = useState(search)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [search])

  const filters: UseConversationsOptions = useMemo(
    () => ({
      inboxId,
      unreadOnly,
      unansweredOnly,
      search: debouncedSearch,
      contactId,
      status,
      labelIds,
      assigneeIds,
    }),
    [inboxId, unreadOnly, unansweredOnly, debouncedSearch, contactId, status, labelIds, assigneeIds],
  )

  // Deep link: só passa contactId na primeira carga para não filtrar após navegação
  const didDeepLink = useRef(false)

  const query = useInfiniteQuery({
    queryKey: inboxKeys.conversations.list(filters),
    queryFn: async ({ pageParam, signal }) => {
      // Suprime o filtro de contactId após o deep link inicial já ter sido resolvido
      const fetchContactId = !didDeepLink.current ? filters.contactId : null
      const filtersWithContact: UseConversationsOptions = { ...filters, contactId: fetchContactId }
      const url = buildUrl(filtersWithContact, pageParam)

      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error('Failed to fetch conversations')
      const data = (await response.json()) as ApiResponse

      // Registrar deep link na primeira vez que o servidor retorna os dados de deep link
      if (!didDeepLink.current && (data.deepLinkConversationId ?? data.deepLinkContact)) {
        didDeepLink.current = true
      }

      return data
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.conversations.at(-1)?.id : undefined,
    // Polling fixo de 5s; desativado quando há erro para evitar flood de requisições
    refetchInterval: (queryState) => {
      if (queryState.state.error) return false
      return 5_000
    },
    refetchIntervalInBackground: false,
  })

  // Flatten de todas as páginas, deduplicação por id e ordenação por updatedAt DESC
  const conversations = useMemo(() => {
    if (!query.data) return []
    const map = new Map<string, ConversationListDto>()
    for (const page of query.data.pages) {
      for (const conv of page.conversations) {
        map.set(conv.id, conv)
      }
    }
    return Array.from(map.values()).sort(
      (convA, convB) => new Date(convB.updatedAt).getTime() - new Date(convA.updatedAt).getTime(),
    )
  }, [query.data])

  // Contadores são autoritativos na primeira página (refetch atualiza automaticamente)
  const firstPage = query.data?.pages[0]
  const totalCount = firstPage?.totalCount ?? 0
  const totalUnread = firstPage?.totalUnread ?? 0
  const totalUnanswered = firstPage?.totalUnanswered ?? 0

  // Deep link: extraídos apenas da primeira página
  const deepLinkConversationId = firstPage?.deepLinkConversationId ?? null
  const deepLinkConversation = firstPage?.deepLinkConversation ?? null
  const deepLinkContact = firstPage?.deepLinkContact ?? null

  // IntersectionObserver sentinel para disparar fetchNextPage automaticamente
  const observerRef = useRef<IntersectionObserver | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
            void fetchNextPage()
          }
        },
        { threshold: 0.1 },
      )
      observerRef.current.observe(node)
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  return {
    conversations,
    isLoading: query.isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    totalCount,
    totalUnread,
    totalUnanswered,
    deepLinkConversationId,
    deepLinkConversation,
    deepLinkContact,
    // Só sinaliza erro de conexão após 3 falhas consecutivas (evita flash em falha pontual)
    connectionError: query.isError && query.failureCount >= 3,
    sentinelRef,
  }
}
