'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  FlaskConical,
  MessageSquare,
  MessageSquarePlus,
  WifiOff,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Skeleton } from '@/_components/ui/skeleton'
import type { MemberRole } from '@prisma/client'
import type {
  ConversationListDto,
  ConversationLabelDto,
} from '@/_data-access/conversation/get-conversations'
import type { DealOptionDto } from '@/_data-access/deal/get-deals-options'
import type { ContactOptionDto } from '@/_data-access/contact/get-contacts-options'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import type { ConversationSortMode } from '@/_data-access/conversation/get-conversations'
import { isElevated } from '@/_lib/rbac/permissions'
import { ConversationList, type FilterTab } from './conversation-list'
import { ChatView } from './chat-view'
import { EmptyInbox } from './empty-inbox'
import { StartConversationPanel } from './start-conversation-panel'
import { NewConversationDialog } from './new-conversation-dialog'
import { SimulatorDialog } from './simulator-dialog'
import { useInboxConversations } from '../_hooks/use-inbox-conversations'
import { useInboxMutations } from '../_hooks/use-inbox-mutations'
import { useAgentStatuses } from '../_hooks/use-agent-statuses'
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
  orgId: string
  members: AcceptedMemberDto[]
  userRole: MemberRole
  currentUserId: string
  availableLabels: ConversationLabelDto[]
  isSuperAdmin: boolean
  agents: AgentDto[]
}

export function InboxClient({
  inboxOptions,
  dealOptions,
  contactOptions,
  orgSlug,
  orgId,
  members,
  userRole,
  currentUserId,
  availableLabels,
  isSuperAdmin,
  agents,
}: InboxClientProps) {
  const elevated = isElevated(userRole)
  const searchParams = useSearchParams()

  // Subscriber único de status do agente para toda a org — evita múltiplas subscriptions
  const { isConversationActive, getStatus } = useAgentStatuses(orgId)
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationListDto | null>(null)
  const [statusFilter, setStatusFilter] = useState<'OPEN' | 'RESOLVED'>('OPEN')
  const [sortMode, setSortMode] = useState<ConversationSortMode>('recent')
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
    sortMode,
  })

  const mutations = useInboxMutations({
    availableLabels,
    members,
    statusFilter,
  })

  // Extrair mutate estável para uso no useEffect sem recriar o effect a cada render
  const markAsReadMutate = mutations.markAsRead.mutate

  // Ao mudar status, remover da lista se não bate com o filtro ativo (ex: resolver no filtro de abertas)
  const handleStatusChange = (
    conversationId: string,
    newStatus: 'OPEN' | 'RESOLVED',
  ) => {
    const statusMutation =
      newStatus === 'RESOLVED'
        ? mutations.resolveConversation
        : mutations.reopenConversation
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
  }, [
    conversations,
    isLoading,
    deepLinkConversationId,
    deepLinkConversation,
    deepLinkContact,
    selectedConversation,
    markAsReadMutate,
  ])

  // Sincroniza selectedConversation com a lista viva a cada polling cycle.
  // Guard por referência de objeto (Object.is): TanStack Query retorna novo objeto quando
  // qualquer campo muda — incluindo labels, que não alteram updatedAt na conversa.
  useEffect(() => {
    if (!selectedConversation) return
    const live = conversations.find(
      (conv) => conv.id === selectedConversation.id,
    )
    if (!live || Object.is(live, selectedConversation)) return
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

  // Sem nenhuma inbox: substituir a tela toda faz sentido — não há de onde disparar
  // Nova Conversa/Simulador sem uma caixa, e o CTA é "Criar Caixa de Entrada"
  if (inboxOptions.length === 0) {
    return <EmptyInbox orgSlug={orgSlug} hasNoInbox />
  }

  // Primeira execução vazia: tem inbox, mas zero conversas e nenhum filtro ativo.
  // NÃO substitui a tela — mantém a sidebar viva (Nova Conversa/Simulador sempre
  // acessíveis) e mostra o empty-state com CTA só no painel de chat, evitando que o
  // usuário precise sair do inbox para criar a primeira conversa.
  const isFirstRunEmpty =
    !isLoading &&
    conversations.length === 0 &&
    !search &&
    filter === 'all' &&
    !selectedInboxId &&
    !deepLinkContact &&
    statusFilter === 'OPEN' &&
    selectedLabelIds.length === 0 &&
    selectedAssigneeIds.length === 0

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
        <div
          data-tour="inbox-list"
          className={cn(
            'w-full md:w-[28rem] md:shrink-0',
            selectedId && 'hidden md:block',
          )}
        >
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
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            selectedLabelIds={selectedLabelIds}
            onLabelIdsChange={setSelectedLabelIds}
            availableLabels={availableLabels}
            selectedAssigneeIds={selectedAssigneeIds}
            onAssigneeIdsChange={setSelectedAssigneeIds}
            currentUserId={currentUserId}
            onResolve={(id) => mutations.resolveConversation.mutate(id)}
            onReopen={(id) => mutations.reopenConversation.mutate(id)}
            onToggleLabel={(conversationId, labelId) =>
              mutations.toggleLabel.mutate({ conversationId, labelId })
            }
            onAssign={(conversationId, assignedTo) =>
              mutations.assignConversation.mutate({
                conversationId,
                assignedTo,
              })
            }
            members={members}
            isSuperAdmin={isSuperAdmin}
            agents={agents}
            onSimulatorConversationCreated={handleConversationCreated}
            onNewConversationCreated={handleConversationCreated}
            isConversationActive={isConversationActive}
          />
        </div>

        {/* Chat panel */}
        <div
          data-tour="inbox-chat"
          className={cn(
            'flex-1 flex-col',
            selectedId ? 'flex' : 'hidden md:flex',
          )}
        >
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
              onToggleAiPause={(id, aiPaused) =>
                mutations.toggleAiPause.mutate({ conversationId: id, aiPaused })
              }
              onStatusChange={handleStatusChange}
              onBack={() => setSelectedConversation(null)}
              onSimulatorEnded={() => setSelectedConversation(null)}
              onSimulatorReset={handleConversationCreated}
              getAgentStatus={getStatus}
            />
          ) : deepLinkContact && !selectedConversation ? (
            <StartConversationPanel
              contact={deepLinkContact}
              inboxOptions={inboxOptions}
              orgSlug={orgSlug}
              onConversationCreated={handleConversationCreated}
            />
          ) : isLoading ? (
            /* Carregando: mesmo layout centralizado do empty-state, mas com skeletons
               no lugar de título/subtítulo. O ícone fica fixo, então quando assenta no
               estado final (CTA ou "Selecione uma conversa") o texto entra no espaço já
               reservado — sem o swap de "Selecione uma conversa" → "Comece sua primeira" */
            <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/50 shadow-md shadow-primary/15">
                  <MessageSquare className="size-8 text-white" />
                </div>
              </div>
              <div className="flex w-full max-w-sm flex-col items-center gap-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
          ) : isFirstRunEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10 blur-xl" />
                <div className="relative flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/80 to-primary/50 shadow-md shadow-primary/15">
                  <MessageSquare className="size-8 text-white" />
                </div>
              </div>
              <div className="max-w-sm space-y-1 text-center">
                <h3 className="text-base font-semibold tracking-tight">
                  Comece sua primeira conversa
                </h3>
                <p className="text-sm text-muted-foreground">
                  Inicie uma conversa no WhatsApp com um contato — ou teste seu
                  agente no simulador, sem sair desta tela.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <NewConversationDialog
                  inboxOptions={inboxOptions}
                  orgSlug={orgSlug}
                  onConversationCreated={handleConversationCreated}
                  trigger={
                    <Button className="gap-1.5">
                      <MessageSquarePlus className="h-4 w-4" />
                      Nova Conversa
                    </Button>
                  }
                />
                {isSuperAdmin && agents.length > 0 && (
                  <SimulatorDialog
                    agents={agents}
                    onConversationCreated={handleConversationCreated}
                    trigger={
                      <Button variant="outline" className="gap-1.5">
                        <FlaskConical className="h-4 w-4" />
                        Simulador
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
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
                  {conversations.length === 0
                    ? 'Nenhuma conversa encontrada'
                    : 'Selecione uma conversa'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {conversations.length === 0
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
