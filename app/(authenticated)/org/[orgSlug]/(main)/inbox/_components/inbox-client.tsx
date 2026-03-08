'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, WifiOff } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { ConversationList } from './conversation-list'
import { ChatView } from './chat-view'
import { EmptyInbox } from './empty-inbox'
import { useConversations } from '../_hooks/use-conversations'

interface InboxOption {
  id: string
  name: string
  channel: string
}

interface InboxClientProps {
  inboxOptions: InboxOption[]
  orgSlug: string
}

type FilterTab = 'all' | 'unread'

export function InboxClient({ inboxOptions, orgSlug }: InboxClientProps) {
  const searchParams = useSearchParams()
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const didApplyDeepLink = useRef(false)

  const contactId = searchParams.get('contactId')

  const {
    conversations,
    isLoading,
    isLoadingMore,
    hasMore,
    totalCount,
    totalUnread,
    deepLinkConversationId,
    connectionError,
    sentinelRef,
  } = useConversations({
    inboxId: selectedInboxId,
    unreadOnly: filter === 'unread',
    search,
    contactId,
  })

  // Deep link: auto-selecionar conversa
  useEffect(() => {
    if (didApplyDeepLink.current || !deepLinkConversationId) return
    setSelectedId(deepLinkConversationId)
    didApplyDeepLink.current = true
  }, [deepLinkConversationId])

  // Quando conversas mudam, manter seleção se possível, senão selecionar primeira
  useEffect(() => {
    if (isLoading || conversations.length === 0) return
    const selectionExists = selectedId && conversations.some(
      (conversation) => conversation.id === selectedId,
    )
    if (!selectionExists) {
      setSelectedId(conversations[0]?.id ?? null)
    }
  }, [conversations, isLoading, selectedId])

  // Se não tem nenhuma inbox, mostrar empty state com CTA
  if (inboxOptions.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} hasNoInbox />
  }

  // Se terminou de carregar e não tem conversas (sem filtros ativos)
  if (!isLoading && conversations.length === 0 && !search && filter === 'all' && !selectedInboxId) {
    return <EmptyInbox orgSlug={orgSlug} />
  }

  const selectedConversation = conversations.find(
    (conversation) => conversation.id === selectedId,
  )

  return (
    <div className="flex h-full flex-col">
      {connectionError && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Conexão instável. Verifique sua internet.</span>
        </div>
      )}
      <div className="flex flex-1 border-t border-border/50">
      {/* Sidebar */}
      <div className="w-80 shrink-0">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          inboxOptions={inboxOptions}
          selectedInboxId={selectedInboxId}
          onInboxSelect={setSelectedInboxId}
          search={search}
          onSearchChange={setSearch}
          filter={filter}
          onFilterChange={setFilter}
          totalCount={totalCount}
          totalUnread={totalUnread}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          sentinelRef={sentinelRef}
        />
      </div>

      {/* Chat panel */}
      <div className="flex flex-1 flex-col">
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            conversation={selectedConversation}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <Card className="max-w-sm border-border/50 bg-secondary/20">
              <CardHeader className="items-center pb-3 text-center">
                <div className="rounded-full bg-muted p-4">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-base">
                  {!isLoading && conversations.length === 0
                    ? 'Nenhuma conversa encontrada'
                    : 'Selecione uma conversa'}
                </CardTitle>
                <CardDescription>
                  {!isLoading && conversations.length === 0
                    ? 'Nenhuma conversa corresponde aos filtros aplicados.'
                    : 'Escolha uma conversa na lista ao lado para visualizar as mensagens e interagir.'}
                </CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
