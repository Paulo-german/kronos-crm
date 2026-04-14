'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare, WifiOff } from 'lucide-react'
import { cn } from '@/_lib/utils'
import type { MemberRole } from '@prisma/client'
import type { ConversationListDto, ConversationLabelDto } from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import { isElevated } from '@/_lib/rbac/permissions'
import { ConversationList, type FilterTab } from './conversation-list'
import { ChatView } from './chat-view'
import { EmptyInbox } from './empty-inbox'
import { StartConversationPanel } from './start-conversation-panel'
import { useInboxConversations } from '../_hooks/use-inbox-conversations'
import { useInboxMutations } from '../_hooks/use-inbox-mutations'
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
  availableLabels: ConversationLabelDto[]
}

export function InboxClient({ inboxOptions, dealOptions, contactOptions, orgSlug, members, userRole, currentUserId, availableLabels }: InboxClientProps) {
  const elevated = isElevated(userRole)
  const searchParams = useSearchParams()
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedConversation, setSelectedConversation] = useState<ConversationListDto | null>(null)
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN')
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([])
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([])
  const didApplyDeepLink = useRef(false)

  // Derivado para backward compat com props que esperam string | null
  const selectedId = selectedConversation?.id ?? null

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
  } = useInboxConversations({
    inboxId: selectedInboxId,
    unreadOnly: filter === 'unread',
    unansweredOnly: filter === 'unanswered',
    search,
    contactId,
    status: statusFilter,
    labelIds: selectedLabelIds,
    assigneeIds: selectedAssigneeIds,
  })

  const mutations = useInboxMutations({
    availableLabels,
    members,
    statusFilter,
  })

  // Extrair mutate estável para uso no useEffect sem recriar o effect a cada render
  const markAsReadMutate = mutations.markAsRead.mutate

  // Ao mudar status, remover da lista se não bate com o filtro ativo (ex: resolver no filtro de abertas)
  const handleStatusChange = (conversationId: string, newStatus: 'OPEN' | 'RESOLVED') => {
    const statusMutation = newStatus === 'RESOLVED' ? mutations.resolveConversation : mutations.reopenConversation
    statusMutation.mutate(conversationId)
    if (newStatus === statusFilter) return
    setSelectedConversation(null)
  }

  // Seleção automática de conversa com cadeia de prioridade
  useEffect(() => {
    if (isLoading) return

    // Prioridade 1: deep link com conversa existente
    if (!didApplyDeepLink.current && deepLinkConversation) {
      setSelectedConversation(deepLinkConversation)
      if (deepLinkConversation.unreadCount > 0) {
        markAsReadMutate(deepLinkConversation.id)
      }
      didApplyDeepLink.current = true
      return
    }

    // Prioridade 1b: deep link de contato sem conversa — não auto-selecionar
    if (deepLinkContact && !deepLinkConversationId) return

    // Prioridade 2: manter seleção existente
    // O objeto persiste mesmo após a conversa sair da lista filtrada (ex: marcada como lida
    // enquanto no filtro "não lidas"), evitando fechar o ChatView involuntariamente
    if (selectedConversation) return
  }, [conversations, isLoading, deepLinkConversationId, deepLinkConversation, deepLinkContact, selectedConversation, markAsReadMutate])

  // Sincroniza selectedConversation com a lista viva a cada polling cycle
  useEffect(() => {
    if (!selectedConversation) return
    const live = conversations.find((conv) => conv.id === selectedConversation.id)
    // Guard: só atualiza se updatedAt mudou, evitando loop de re-renders
    if (!live || live.updatedAt === selectedConversation.updatedAt) return
    setSelectedConversation(live)
  }, [conversations, selectedConversation])

  const handleSelect = (conversationId: string) => {
    const target = conversations.find((conv) => conv.id === conversationId)
    if (!target) return
    setSelectedConversation(target)
    if (target.unreadCount > 0) {
      mutations.markAsRead.mutate(conversationId)
    }
  }

  const handleConversationCreated = (conversation: ConversationListDto) => {
    setSelectedConversation(conversation)
  }

  // Se não tem nenhuma inbox, mostrar empty state com CTA
  if (inboxOptions.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} hasNoInbox />
  }

  // Se terminou de carregar e não tem conversas (sem filtros ativos) e não é deep link de contato
  if (!isLoading && conversations.length === 0 && !search && filter === 'all' && !selectedInboxId && !deepLinkContact && statusFilter === 'OPEN' && selectedLabelIds.length === 0 && selectedAssigneeIds.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} />
  }

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
          onSelect={handleSelect}
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
          onToggleRead={(id) => mutations.toggleReadStatus.mutate(id)}
          isElevated={elevated}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          selectedLabelIds={selectedLabelIds}
          onLabelIdsChange={setSelectedLabelIds}
          availableLabels={availableLabels}
          selectedAssigneeIds={selectedAssigneeIds}
          onAssigneeIdsChange={setSelectedAssigneeIds}
          currentUserId={currentUserId}
          onResolve={(id) => mutations.resolveConversation.mutate(id)}
          onReopen={(id) => mutations.reopenConversation.mutate(id)}
          onToggleLabel={(conversationId, labelId) => mutations.toggleLabel.mutate({ conversationId, labelId })}
          onAssign={(conversationId, assignedTo) => mutations.assignConversation.mutate({ conversationId, assignedTo })}
          members={members}
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
            availableLabels={availableLabels}
            onToggleAiPause={(id, aiPaused) => mutations.toggleAiPause.mutate({ conversationId: id, aiPaused })}
            onStatusChange={handleStatusChange}
            onBack={() => setSelectedConversation(null)}
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
