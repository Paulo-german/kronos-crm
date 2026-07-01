'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ArrowUpDown,
  Bot,
  FlaskConical,
  Inbox,
  Instagram,
  Loader2,
  MoreVertical,
  Pause,
  Play,
  Search,
  Settings2,
  Tag,
  UserCog,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Skeleton } from '@/_components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import type {
  ConversationListDto,
  ConversationLabelDto,
  ConversationSortMode,
} from '@/_data-access/conversation/get-conversations'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { AgentDto } from '@/_data-access/agent/get-agents'
import { SimulatorDialog } from './simulator-dialog'
import { NewConversationDialog } from './new-conversation-dialog'
import { getLabelColor } from '@/_lib/constants/label-colors'
import {
  ConversationContextMenu,
  ConversationMenuItems,
} from './conversation-context-menu'
import { ConversationFilterPanel } from './conversation-filter-panel'
import { renderWhatsappText } from './whatsapp-text'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface InboxOption {
  id: string
  name: string
  channel: string
  isConnected: boolean
}

export type FilterTab = 'all' | 'unread' | 'unanswered'

interface ConversationListProps {
  conversations: ConversationListDto[]
  selectedId: string | null
  onSelect: (id: string) => void
  inboxOptions?: InboxOption[]
  selectedInboxId?: string | null
  onInboxSelect?: (inboxId: string | null) => void
  search: string
  onSearchChange: (value: string) => void
  filter: FilterTab
  onFilterChange: (value: FilterTab) => void
  totalCount: number
  totalUnread: number
  totalUnanswered: number
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLElement | null) => void
  orgSlug: string
  onToggleRead: (conversationId: string) => void
  isElevated: boolean
  statusFilter: 'OPEN' | 'RESOLVED'
  onStatusFilterChange: (status: 'OPEN' | 'RESOLVED') => void
  sortMode: ConversationSortMode
  onSortModeChange: (sortMode: ConversationSortMode) => void
  selectedLabelIds: string[]
  onLabelIdsChange: (ids: string[]) => void
  availableLabels: ConversationLabelDto[]
  selectedAssigneeIds: string[]
  onAssigneeIdsChange: (ids: string[]) => void
  currentUserId: string
  onResolve: (conversationId: string) => void
  onReopen: (conversationId: string) => void
  onToggleLabel: (conversationId: string, labelId: string) => void
  onAssign: (conversationId: string, userId: string) => void
  members: AcceptedMemberDto[]
  /** Apenas super admins veem o botão do simulador */
  isSuperAdmin?: boolean
  agents?: AgentDto[]
  onSimulatorConversationCreated?: (conversation: ConversationListDto) => void
  /** Callback quando uma nova conversa é criada pelo diálogo de Nova Conversa */
  onNewConversationCreated?: (conversation: ConversationListDto) => void
  /** Retorna true se o agente IA está processando ativamente esta conversa */
  isConversationActive?: (conversationId: string) => boolean
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

function truncateMessage(content: string, maxLength = 60): string {
  if (content.length <= maxLength) return content
  return content.slice(0, maxLength) + '...'
}

const channelLabels: Record<string, string> = {
  WHATSAPP: 'WhatsApp',
  WEB_CHAT: 'Web Chat',
  INSTAGRAM_DM: 'Instagram Direct',
}

const sortModeLabels: Record<ConversationSortMode, string> = {
  recent: 'Mais recentes',
  oldest: 'Mais antigas',
  unanswered_first: 'Não respondidas primeiro',
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-start gap-3 p-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state por tab
// ---------------------------------------------------------------------------

function emptyMessage(filter: FilterTab, search: string): string {
  if (search) return 'Nenhum contato encontrado'
  if (filter === 'unread') return 'Nenhuma conversa não lida'
  if (filter === 'unanswered') return 'Nenhuma conversa sem resposta'
  return 'Nenhuma conversa'
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  inboxOptions,
  selectedInboxId,
  onInboxSelect,
  search,
  onSearchChange,
  filter,
  onFilterChange,
  totalCount,
  totalUnread,
  totalUnanswered,
  isLoading,
  isLoadingMore,
  hasMore,
  sentinelRef,
  orgSlug,
  onToggleRead,
  isElevated,
  statusFilter,
  onStatusFilterChange,
  sortMode,
  onSortModeChange,
  selectedLabelIds,
  onLabelIdsChange,
  availableLabels,
  selectedAssigneeIds,
  onAssigneeIdsChange,
  currentUserId,
  onResolve,
  onReopen,
  onToggleLabel,
  onAssign,
  members,
  isSuperAdmin,
  agents,
  onSimulatorConversationCreated,
  onNewConversationCreated,
  isConversationActive,
}: ConversationListProps) {
  return (
    <div className="flex h-full flex-col border-r border-border/50">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        {inboxOptions && inboxOptions.length > 1 && onInboxSelect && (
          <div className="mb-3">
            <Select
              value={selectedInboxId ?? 'all'}
              onValueChange={(value) =>
                onInboxSelect(value === 'all' ? null : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as caixas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as caixas de entrada</SelectItem>
                {inboxOptions.map((inbox) => (
                  <SelectItem key={inbox.id} value={inbox.id}>
                    {inbox.name} (
                    {channelLabels[inbox.channel] ?? inbox.channel})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Conversas</h2>
          <Badge
            variant="secondary"
            className="h-5 px-1.5 text-[10px] font-medium"
          >
            {totalCount}
          </Badge>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
            {statusFilter === 'OPEN' ? 'Abertas' : 'Resolvidas'}
          </Badge>
          <div className="flex-1" />
          <TooltipProvider>
            <Tooltip>
              <DropdownMenu>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      <span className="sr-only">Ordenar conversas</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={sortMode}
                    onValueChange={(value) =>
                      onSortModeChange(value as ConversationSortMode)
                    }
                  >
                    {(
                      Object.keys(sortModeLabels) as ConversationSortMode[]
                    ).map((mode) => (
                      <DropdownMenuRadioItem key={mode} value={mode}>
                        {sortModeLabels[mode]}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <TooltipContent side="bottom">
                <p>{sortModeLabels[sortMode]}</p>
              </TooltipContent>
            </Tooltip>
            <ConversationFilterPanel
              statusFilter={statusFilter}
              onStatusFilterChange={onStatusFilterChange}
              selectedLabelIds={selectedLabelIds}
              onLabelIdsChange={onLabelIdsChange}
              availableLabels={availableLabels}
              selectedAssigneeIds={selectedAssigneeIds}
              onAssigneeIdsChange={onAssigneeIdsChange}
              availableAssignees={members}
              currentUserId={currentUserId}
              showAssigneeFilter={isElevated}
            />
            {/* Botão de nova conversa — disponível para todos os membros */}
            {inboxOptions && onNewConversationCreated && (
              <NewConversationDialog
                inboxOptions={inboxOptions}
                orgSlug={orgSlug}
                onConversationCreated={onNewConversationCreated}
              />
            )}
            {/* Botão do simulador — visível apenas para super admins */}
            {isSuperAdmin && agents && onSimulatorConversationCreated && (
              <SimulatorDialog
                agents={agents}
                onConversationCreated={onSimulatorConversationCreated}
              />
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <div data-tour="inbox-manage">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                    asChild
                  >
                    <Link href={`/org/${orgSlug}/settings/inboxes`}>
                      <Settings2 className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Gerenciar Caixas</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Filtro: Todas / Não lidas / Não respondidos */}
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value as FilterTab)}
          className="mb-3"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="unread" className="gap-1.5">
              Não lidas
              {totalUnread > 0 && (
                <Badge className="pointer-events-none flex h-5 min-w-5 items-center justify-center rounded-full bg-kronos-green px-1 text-[10px] font-medium text-white hover:bg-kronos-green">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="unanswered">
              Sem resp.
              {totalUnanswered > 0 && (
                <Badge className="pointer-events-none flex h-5 min-w-5 items-center justify-center rounded-full bg-kronos-yellow px-1 text-[10px] font-medium text-white hover:bg-kronos-yellow">
                  {totalUnanswered > 9 ? '9+' : totalUnanswered}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email ou ID da conversa..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-kronos-purple/50 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex flex-col">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {emptyMessage(filter, search)}
              </div>
            )}

            {conversations.map((conversation) => {
              const isSelected = selectedId === conversation.id
              const hasUnread = conversation.unreadCount > 0
              const agentDisplayName =
                conversation.agentName ??
                conversation.activeAgentName ??
                conversation.agentGroupName

              return (
                <ConversationContextMenu
                  key={conversation.id}
                  conversation={conversation}
                  onToggleRead={onToggleRead}
                  onResolve={onResolve}
                  onReopen={onReopen}
                  onToggleLabel={onToggleLabel}
                  onAssign={onAssign}
                  availableLabels={availableLabels}
                  members={members}
                  isElevated={isElevated}
                  orgSlug={orgSlug}
                >
                  {/* group/item para revelar botão 3 pontinhos no hover */}
                  <div className="group/item relative">
                    <button
                      onClick={() => onSelect(conversation.id)}
                      className={cn(
                        'flex w-full items-start gap-3 border-l-2 border-l-transparent p-3 text-left transition-colors duration-200 hover:bg-accent/30',
                        isSelected && 'border-l-primary bg-accent/50',
                        !isSelected && hasUnread && 'bg-primary/[0.07]',
                      )}
                    >
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarImage
                          src={`/api/inbox/${conversation.id}/contact-avatar`}
                        />
                        <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                          {getInitials(conversation.contactName)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span
                              className={cn(
                                'truncate text-sm',
                                hasUnread ? 'font-semibold' : 'font-medium',
                              )}
                            >
                              {conversation.contactName}
                            </span>
                            {/* Ícone de canal Instagram Direct */}
                            {conversation.channel === 'INSTAGRAM_DM' && (
                              <Instagram className="h-3 w-3 shrink-0 text-pink-500" />
                            )}
                            {/* Badge do simulador — identifica conversas simuladas na lista */}
                            {conversation.inboxConnectionType ===
                              'SIMULATOR' && (
                              <Badge
                                variant="outline"
                                className="bg-cyan/20 h-4 shrink-0 gap-0.5 border-cyan-300/20 px-1 text-[9px] text-kronos-cyan"
                              >
                                <FlaskConical className="h-2.5 w-2.5" />
                                Simulação
                              </Badge>
                            )}
                          </div>
                          {/* Timestamp — oculto no hover para dar lugar ao botão de ação */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            {conversation.lastMessage && (
                              <span className="text-[10px] text-muted-foreground transition-opacity duration-150 group-hover/item:opacity-0">
                                {formatDistanceToNow(
                                  new Date(conversation.lastMessage.createdAt),
                                  { locale: ptBR, addSuffix: false },
                                )}
                              </span>
                            )}
                            {hasUnread && (
                              <Badge className="flex h-5 min-w-5 items-center justify-center rounded-full bg-kronos-green px-1 text-[10px] font-medium text-white hover:bg-kronos-green">
                                {conversation.unreadCount > 9
                                  ? '9+'
                                  : conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {conversation.lastMessage && (
                          <p
                            className={cn(
                              'mt-0.5 truncate text-xs text-muted-foreground',
                              hasUnread && 'font-medium text-foreground/90',
                            )}
                          >
                            {conversation.lastMessage.role === 'assistant' && (
                              <span className="font-medium">Você: </span>
                            )}
                            {renderWhatsappText(
                              truncateMessage(conversation.lastMessage.content),
                            )}
                          </p>
                        )}

                        <div className="mt-1.5 flex items-center gap-1.5">
                          {/* Badge da caixa de entrada — só quando há mais de um canal, senão é ruído */}
                          {inboxOptions && inboxOptions.length > 1 && (
                            <Badge
                              variant="outline"
                              className="h-5 max-w-[100px] gap-1 border-border px-1.5 text-[10px] text-muted-foreground"
                            >
                              <Inbox className="h-3 w-3 shrink-0" />
                              <span className="truncate">
                                {conversation.inboxName}
                              </span>
                            </Badge>
                          )}
                          {agentDisplayName && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-5 max-w-[120px] gap-1 px-1.5 text-[10px] transition-colors duration-300',
                                isConversationActive?.(conversation.id)
                                  ? 'border-kronos-green/20 bg-kronos-green/10 text-kronos-green'
                                  : 'border-kronos-purple/20 bg-kronos-purple/10 text-kronos-purple',
                              )}
                            >
                              {isConversationActive?.(conversation.id) ? (
                                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
                              ) : (
                                <Bot className="h-3 w-3 shrink-0" />
                              )}
                              <span className="truncate">
                                {agentDisplayName}
                              </span>
                            </Badge>
                          )}
                          {conversation.aiPaused ? (
                            <Badge
                              variant="outline"
                              className="h-5 w-5 items-center justify-center border-kronos-yellow/20 bg-kronos-yellow/10 p-0 text-kronos-yellow"
                            >
                              <Pause className="h-3 w-3 fill-current" />
                            </Badge>
                          ) : (conversation.agentName ??
                            conversation.agentGroupName) ? (
                            <Badge
                              variant="outline"
                              className="h-5 w-5 items-center justify-center border-kronos-green/20 bg-kronos-green/10 p-0 text-kronos-green"
                            >
                              <Play className="h-3 w-3 fill-current" />
                            </Badge>
                          ) : null}

                          {/* Badge do responsável — visível apenas para ADMIN/OWNER */}
                          {isElevated && conversation.assigneeName && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant="outline"
                                    className="h-5 gap-1 border-border px-1.5 text-[10px] text-muted-foreground"
                                  >
                                    <UserCog className="h-3 w-3" />
                                    {getInitials(conversation.assigneeName)}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p>
                                    Responsável: {conversation.assigneeName}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {/* Labels da conversa */}
                          {conversation.labels.map((label) => {
                            const colorConfig = getLabelColor(label.color)
                            return (
                              <Badge
                                key={label.id}
                                className={cn(
                                  'h-5 max-w-[100px] gap-1 border-transparent px-1.5 text-[10px]',
                                  colorConfig.bg,
                                  colorConfig.text,
                                  colorConfig.dark_text,
                                )}
                              >
                                <Tag
                                  className={cn(
                                    'h-3 w-3 shrink-0',
                                    colorConfig.text,
                                  )}
                                />
                                <span className="truncate">{label.name}</span>
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    </button>

                    {/* Botão 3 pontinhos — aparece no hover via group/item */}
                    <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-150 group-hover/item:opacity-100">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-md bg-card/80 shadow-sm backdrop-blur-sm hover:bg-accent"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                            <span className="sr-only">Ações da conversa</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <ConversationMenuItems
                            conversation={conversation}
                            onToggleRead={onToggleRead}
                            onResolve={onResolve}
                            onReopen={onReopen}
                            onToggleLabel={onToggleLabel}
                            onAssign={onAssign}
                            availableLabels={availableLabels}
                            members={members}
                            isElevated={isElevated}
                            orgSlug={orgSlug}
                            isPending={false}
                            variant="dropdown"
                          />
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </ConversationContextMenu>
              )
            })}

            {/* Sentinel para infinite scroll */}
            {hasMore && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center py-4"
              >
                {isLoadingMore && (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
