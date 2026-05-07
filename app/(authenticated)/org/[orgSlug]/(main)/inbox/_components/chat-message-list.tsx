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

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

interface EditableMessageShape {
  role: string
  deliveryStatus: string | null
  metadata: unknown
  createdAt: Date | string
}

function isMessageEditable(msg: EditableMessageShape, canEditMessages: boolean): boolean {
  if (!canEditMessages) return false
  if (msg.role !== 'assistant') return false
  const allowedStatuses = ['sent', 'delivered', 'read']
  if (!allowedStatuses.includes(msg.deliveryStatus ?? '')) return false
  // Narrow metadata para acessar campos com segurança
  const meta = msg.metadata !== null && typeof msg.metadata === 'object'
    ? msg.metadata as Record<string, unknown>
    : null
  if (meta?.media) return false
  if (meta?.template) return false
  if (meta?.sentFrom !== 'inbox') return false
  const ageMs = Date.now() - new Date(msg.createdAt).getTime()
  if (ageMs > FIFTEEN_MINUTES_MS) return false
  return true
}

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
  canEditMessages: boolean
  onEditMessage?: (messageId: string, conversationId: string, newText: string) => void
  editingMessageId?: string | null
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
  canEditMessages,
  onEditMessage,
  editingMessageId,
}: ChatMessageListProps) {
  return (
    <div className="relative flex-1 min-h-0">
      {/* Background pattern sutil — bolinhas em grade de 20px */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.05]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
        }}
      />
      <ScrollArea className="h-full px-4" ref={scrollAreaRef}>
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
            <div key={`day-${item.date}`} className="flex items-center justify-center py-3">
              <span className="rounded-full border border-border/40 bg-background/80 px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur-sm">
                {formatDayLabel(item.date)}
              </span>
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
              canEdit={
                // Chunks de IA têm id no formato `${originalId}-${index}` com segmentos extras
                !item.data.isAiGenerated || item.data.id.split('-').length <= 5
                  ? isMessageEditable(item.data, canEditMessages)
                  : false
              }
              onEdit={onEditMessage}
              isEditing={editingMessageId === item.data.id}
            />
          ),
        )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>
    </div>
  )
}
