'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react'

type EventType = 'TOOL_SUCCESS' | 'TOOL_FAILURE' | 'PROCESSING_ERROR' | 'INFO'

interface ConversationEventBubbleProps {
  type: EventType
  content: string
  createdAt: Date | string
}

const EVENT_CONFIG: Record<
  EventType,
  { icon: typeof CheckCircle2; colorClass: string }
> = {
  TOOL_SUCCESS: { icon: CheckCircle2, colorClass: 'text-emerald-600' },
  TOOL_FAILURE: { icon: XCircle, colorClass: 'text-red-500' },
  PROCESSING_ERROR: { icon: AlertTriangle, colorClass: 'text-red-500' },
  INFO: { icon: Info, colorClass: 'text-amber-500' },
}

export function ConversationEventBubble({
  type,
  content,
  createdAt,
}: ConversationEventBubbleProps) {
  const config = EVENT_CONFIG[type]
  const Icon = config.icon
  const timestamp = new Date(createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="h-px flex-1 bg-border/30" />
      <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.colorClass}`} />
        <span>{content}</span>
        <span className="text-[10px] opacity-60">{timestamp}</span>
      </div>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  )
}
