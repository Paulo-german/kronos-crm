'use client'

import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CircleIcon, Loader2, Pause, Search } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Input } from '@/_components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { Skeleton } from '@/_components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface InboxOption {
  id: string
  name: string
  channel: string
}

type FilterTab = 'all' | 'unread'

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
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLElement | null) => void
}

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
}

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
  isLoading,
  isLoadingMore,
  hasMore,
  sentinelRef,
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
        </div>

        {/* Filtro: Todas / Não lidas */}
        <Tabs
          value={filter}
          onValueChange={(value) => onFilterChange(value as FilterTab)}
          className="mb-3"
        >
          <TabsList className="grid h-10 w-full grid-cols-2 rounded-md border border-border/50 bg-tab/30">
            <TabsTrigger
              value="all"
              className="rounded-md py-1.5 data-[state=active]:bg-card/80"
            >
              Todas
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="gap-1.5 rounded-md py-1.5 data-[state=active]:bg-card/80"
            >
              Não lidas
              {totalUnread > 0 && (
                <Badge className="h-4 min-w-4 bg-kronos-green px-1 text-[10px] font-medium text-white">
                  {totalUnread > 9 ? '9+' : totalUnread}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-kronos-purple/50 [&::-webkit-scrollbar-track]:bg-transparent">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex flex-col gap-1">
            {conversations.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? 'Nenhum contato encontrado'
                  : filter === 'unread'
                    ? 'Nenhuma conversa não lida'
                    : 'Nenhuma conversa'}
              </div>
            )}

            {conversations.map((conversation) => {
              const isSelected = selectedId === conversation.id
              const hasUnread = conversation.unreadCount > 0

              return (
                <button
                  key={conversation.id}
                  onClick={() => onSelect(conversation.id)}
                  className={cn(
                    'flex w-full items-start gap-3 border border-transparent p-3 text-left transition-colors duration-200 hover:bg-accent/30',
                    isSelected && 'border-border/50 bg-accent/50',
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage />
                    <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                      {getInitials(conversation.contactName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'truncate text-sm',
                          hasUnread ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {conversation.contactName}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {conversation.lastMessage && (
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(
                              new Date(conversation.lastMessage.createdAt),
                              { locale: ptBR, addSuffix: false },
                            )}
                          </span>
                        )}
                        {hasUnread && (
                          <Badge className="h-5 min-w-5 rounded-full bg-kronos-green px-1 text-[10px] font-medium text-white hover:bg-kronos-green">
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
                          hasUnread && 'font-medium text-foreground/80',
                        )}
                      >
                        {conversation.lastMessage.role === 'assistant' && (
                          <span className="font-medium">Você: </span>
                        )}
                        {truncateMessage(conversation.lastMessage.content)}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-1.5">
                      {conversation.agentName && (
                        <Badge
                          variant="outline"
                          className="h-5 border-kronos-purple/20 bg-kronos-purple/10 px-1.5 text-[10px] text-kronos-purple"
                        >
                          {conversation.agentName}
                        </Badge>
                      )}
                      {conversation.aiPaused ? (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-kronos-yellow/20 bg-kronos-yellow/10 px-1.5 text-[10px] text-kronos-yellow"
                        >
                          <Pause className="h-3 w-3" />
                          Pausada
                        </Badge>
                      ) : conversation.agentName ? (
                        <Badge
                          variant="outline"
                          className="h-5 gap-1 border-kronos-green/20 bg-kronos-green/10 px-1.5 text-[10px] text-kronos-green"
                        >
                          <CircleIcon className="h-2 w-2 fill-current" />
                          Ativa
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                </button>
              )
            })}

            {/* Sentinel for infinite scroll */}
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
