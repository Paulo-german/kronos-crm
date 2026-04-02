'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, WifiOff } from 'lucide-react'
import { cn } from '@/_lib/utils'
import type { MemberRole } from '@prisma/client'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { isElevated } from '@/_lib/rbac/permissions'
import { ConversationList, type FilterTab } from './conversation-list'
import { ChatView } from './chat-view'
import { EmptyInbox } from './empty-inbox'
import { StartConversationPanel } from './start-conversation-panel'
import { useConversations } from '../_hooks/use-conversations'
import { PageTourTrigger } from '@/_components/onboarding/page-tour-trigger'
import { INBOX_TOUR_STEPS } from '@/_lib/onboarding/tours/inbox-tour'

interface InboxOption {
  id: string
  name: string
  channel: string
  isConnected: boolean
}

interface InboxClientProps {
  inboxOptions: InboxOption[]
  dealOptions: DealOptionDto[]
  contactOptions: ContactOptionDto[]
  orgSlug: string
  members: AcceptedMemberDto[]
  userRole: MemberRole
  currentUserId: string
}

export function InboxClient({ inboxOptions, dealOptions, contactOptions, orgSlug, members, userRole, currentUserId }: InboxClientProps) {
  const elevated = isElevated(userRole)
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
    totalUnanswered,
    deepLinkConversationId,
    deepLinkConversation,
    deepLinkContact,
    connectionError,
    sentinelRef,
    updateConversationLocally,
    refetch,
  } = useConversations({
    inboxId: selectedInboxId,
    unreadOnly: filter === 'unread',
    unansweredOnly: filter === 'unanswered',
    search,
    contactId,
  })

  // Optimistic update + refetch para atualizar badge da IA na conversation list
  const handleToggleAiPause = (conversationId: string, aiPaused: boolean) => {
    updateConversationLocally(conversationId, { aiPaused })
    refetch()
  }

  // Optimistic update + refetch para atualizar contadores (totalUnread, etc.)
  // O lock no hook protege o update otimista de ser sobrescrito pelo merge do polling
  const handleToggleRead = (conversationId: string) => {
    const target = conversations.find((conv) => conv.id === conversationId)
    if (!target) return
    const newUnreadCount = target.unreadCount > 0 ? 0 : 1
    updateConversationLocally(conversationId, { unreadCount: newUnreadCount })
    refetch()
  }

  // Seleção automática de conversa com cadeia de prioridade
  useEffect(() => {
    if (isLoading) return

    // Prioridade 1: deep link com conversa existente
    if (!didApplyDeepLink.current && deepLinkConversationId) {
      setSelectedId(deepLinkConversationId)
      didApplyDeepLink.current = true
      return
    }

    // Prioridade 1b: deep link sem conversa (contato sem conversa) — não auto-selecionar
    if (deepLinkContact && !deepLinkConversationId) {
      return
    }

    if (conversations.length === 0) return

    // Prioridade 2: manter seleção atual se ainda existe na lista ou é deep link
    if (selectedId && (conversations.some((conv) => conv.id === selectedId) || selectedId === deepLinkConversationId)) return

    // Prioridade 3: limpar seleção se a conversa selecionada saiu da lista
    if (selectedId) setSelectedId(null)
  }, [conversations, isLoading, deepLinkConversationId, deepLinkContact, selectedId])

  const handleConversationCreated = (conversation: ConversationListDto) => {
    setSelectedId(conversation.id)
  }

  // Se não tem nenhuma inbox, mostrar empty state com CTA
  if (inboxOptions.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} hasNoInbox />
  }

  // Se terminou de carregar e não tem conversas (sem filtros ativos) e não é deep link de contato
  if (!isLoading && conversations.length === 0 && !search && filter === 'all' && !selectedInboxId && !deepLinkContact) {
    return <EmptyInbox orgSlug={orgSlug} />
  }

  const selectedConversation =
    conversations.find((conversation) => conversation.id === selectedId)
    ?? (selectedId === deepLinkConversationId ? deepLinkConversation : null)

  return (
    <div className="flex h-full flex-col">
      {connectionError && (
        <div className="flex items-center gap-2 border-b border-destructive/20 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>Conexão instável. Verifique sua internet.</span>
        </div>
      )}
      <div className="flex min-h-0 flex-1 border-t border-border/50">
      {/* Sidebar */}
      <div data-tour="inbox-list" className={cn(
        'w-full md:w-96 md:shrink-0',
        selectedId && 'hidden md:block',
      )}>
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
          totalUnanswered={totalUnanswered}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          sentinelRef={sentinelRef}
          orgSlug={orgSlug}
          onToggleRead={handleToggleRead}
          isElevated={elevated}
        />
      </div>

      {/* Chat panel */}
      <div data-tour="inbox-chat" className={cn(
        'flex-1 flex-col',
        selectedId ? 'flex' : 'hidden md:flex',
      )}>
        {selectedConversation ? (
          <ChatView
            key={selectedConversation.id}
            conversation={selectedConversation}
            dealOptions={dealOptions}
            contactOptions={contactOptions}
            orgSlug={orgSlug}
            members={members}
            isElevated={elevated}
            currentUserId={currentUserId}
            onToggleAiPause={handleToggleAiPause}
            onBack={() => setSelectedId(null)}
          />
        ) : deepLinkContact && !selectedConversation ? (
          <StartConversationPanel
            contact={deepLinkContact}
            inboxOptions={inboxOptions}
            orgSlug={orgSlug}
            onConversationCreated={handleConversationCreated}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
              <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/50 shadow-md shadow-primary/15">
                <MessageSquare className="size-8 text-white" />
              </div>
            </div>
            <div className="max-w-sm space-y-1 text-center">
              <h3 className="text-base font-semibold tracking-tight">
                {!isLoading && conversations.length === 0
                  ? 'Nenhuma conversa encontrada'
                  : 'Selecione uma conversa'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {!isLoading && conversations.length === 0
                  ? 'Nenhuma conversa corresponde aos filtros aplicados.'
                  : 'Escolha uma conversa na lista ao lado para visualizar as mensagens e interagir.'}
              </p>
            </div>
          </div>
        )}
      </div>
      </div>

      <PageTourTrigger tourId="inbox" steps={INBOX_TOUR_STEPS} />
    </div>
  )
}
