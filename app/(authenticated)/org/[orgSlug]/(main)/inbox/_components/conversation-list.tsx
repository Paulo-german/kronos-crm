'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CircleIcon, Pause, Search } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Input } from '@/_components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { Badge } from '@/_components/ui/badge'
import { ScrollArea } from '@/_components/ui/scroll-area'
import type { ConversationListDto } from '@/_data-access/conversation/get-conversations'

interface ConversationListProps {
  conversations: ConversationListDto[]
  selectedId: string | null
  onSelect: (id: string) => void
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

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('')

  const filtered = conversations.filter((conversation) =>
    conversation.contactName.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="flex h-full flex-col border-r border-border/50">
      {/* Header */}
      <div className="border-b border-border/50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight">Conversas</h2>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
            {conversations.length}
          </Badge>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar contato..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1">
        <div className="py-1">
          {filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search ? 'Nenhum contato encontrado' : 'Nenhuma conversa'}
            </div>
          )}

          {filtered.map((conversation) => {
            const isSelected = selectedId === conversation.id

            return (
              <button
                key={conversation.id}
                onClick={() => onSelect(conversation.id)}
                className={cn(
                  'mx-2 my-0.5 flex w-[calc(100%-1rem)] items-start gap-3 rounded-lg p-3 text-left transition-colors duration-200 hover:bg-accent/50',
                  isSelected && 'border-l-2 border-primary bg-primary/10',
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
                    <span className="truncate text-sm font-medium">
                      {conversation.contactName}
                    </span>
                    {conversation.lastMessage && (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(
                          new Date(conversation.lastMessage.createdAt),
                          { locale: ptBR, addSuffix: false },
                        )}
                      </span>
                    )}
                  </div>

                  {conversation.lastMessage && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {conversation.lastMessage.role === 'assistant' && (
                        <span className="font-medium">Você: </span>
                      )}
                      {truncateMessage(conversation.lastMessage.content)}
                    </p>
                  )}

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className="h-5 border-kronos-purple/20 bg-kronos-purple/10 px-1.5 text-[10px] text-kronos-purple"
                    >
                      {conversation.agentName}
                    </Badge>
                    {conversation.aiPaused ? (
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-kronos-yellow/20 bg-kronos-yellow/10 px-1.5 text-[10px] text-kronos-yellow"
                      >
                        <Pause className="h-3 w-3" />
                        Pausada
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 gap-1 border-kronos-green/20 bg-kronos-green/10 px-1.5 text-[10px] text-kronos-green"
                      >
                        <CircleIcon className="h-2 w-2 fill-current" />
                        Ativa
                      </Badge>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
