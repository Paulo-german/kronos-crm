import type { ConversationEventDto } from '@/_lib/conversation-events/types'

export interface MessageDto {
  id: string
  role: string
  content: string
  metadata: unknown
  createdAt: Date | string
  deliveryStatus: string | null
  isAiGenerated: boolean
}

export type TimelineItem =
  | { kind: 'message'; data: MessageDto }
  | { kind: 'event'; data: ConversationEventDto }
  | { kind: 'day-separator'; date: string }
