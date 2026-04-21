'use client'

import type { RefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { isToday, isYesterday } from 'date-fns'
import { Button } from '@/_components/ui/button'
import { ScrollArea } from '@/_components/ui/scroll-area'
import { formatDate } from '@/_lib/utils'
import { MessageBubble } from './message-bubble'
import { ConversationEventBubble } from './conversation-event-bubble'
import type { TimelineItem } from './chat-types'

function formatDayLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00')
  if (isToday(date)) return 'Hoje'
  if (isYesterday(date)) return 'Ontem'
  return formatDate(date)
}

interface ChatMessageListProps {
  conversationId: string
  displayTimeline: TimelineItem[]
  isLoadingMessages: boolean
  hasMore: boolean
  isLoadingMore: boolean
  messageCount: number
  scrollRef: RefObject<HTMLDivElement | null>
  scrollAreaRef: RefObject<HTMLDivElement | null>
  onLoadMore: () => void
  onRetryMessage?: (messageId: string) => void
  retryingMessageId?: string | null
}

export function ChatMessageList({
  conversationId,
  displayTimeline,
  isLoadingMessages,
  hasMore,
  isLoadingMore,
  messageCount,
  scrollRef,
  scrollAreaRef,
  onLoadMore,
  onRetryMessage,
  retryingMessageId,
}: ChatMessageListProps) {
  return (
    <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
      <div className="space-y-3 py-4">
        {isLoadingMessages && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoadingMessages && messageCount === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Nenhuma mensagem nesta conversa
          </div>
        )}

        {hasMore && !isLoadingMessages && (
          <div className="flex justify-center pb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Carregar anteriores
            </Button>
          </div>
        )}

        {displayTimeline.map((item) =>
          item.kind === 'day-separator' ? (
            <div key={`day-${item.date}`} className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border/30" />
              <span className="shrink-0 text-[11px] font-medium text-muted-foreground">
                {formatDayLabel(item.date)}
              </span>
              <div className="h-px flex-1 bg-border/30" />
            </div>
          ) : item.kind === 'event' ? (
            <ConversationEventBubble
              key={`event-${item.data.id}`}
              type={item.data.type}
              content={item.data.content}
              createdAt={item.data.createdAt}
              toolName={item.data.toolName}
              metadata={item.data.metadata}
            />
          ) : (
            <MessageBubble
              key={item.data.id}
              id={item.data.id}
              conversationId={conversationId}
              role={item.data.role}
              content={item.data.content}
              metadata={item.data.metadata}
              createdAt={item.data.createdAt}
              deliveryStatus={item.data.deliveryStatus}
              isAiGenerated={item.data.isAiGenerated}
              onRetry={onRetryMessage}
              isRetrying={retryingMessageId === item.data.id}
            />
          ),
        )}

        <div ref={scrollRef} />
      </div>
    </ScrollArea>
  )
}
