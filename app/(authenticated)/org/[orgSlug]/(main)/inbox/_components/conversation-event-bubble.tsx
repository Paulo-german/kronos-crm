'use client'

import { CheckCircle2, XCircle, AlertTriangle, Info, ArrowRightLeft, UserCheck, ShieldAlert, MessageSquareOff } from 'lucide-react'
import type { ConversationEventType, ToolSuccessSubtype, InfoSubtype } from '@/_lib/conversation-events/types'

interface ConversationEventBubbleProps {
  type: ConversationEventType
  content: string
  createdAt: Date | string
  // Subtype opcional para renderização especializada de eventos de roteamento
  toolName?: string | null
  metadata?: Record<string, unknown> | null
}

interface EventStyleConfig {
  icon: typeof CheckCircle2
  colorClass: string
  bgClass: string
}

const BASE_EVENT_CONFIG: Record<ConversationEventType, EventStyleConfig> = {
  TOOL_SUCCESS: {
    icon: CheckCircle2,
    colorClass: 'text-emerald-600',
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/20',
  },
  TOOL_FAILURE: {
    icon: XCircle,
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-950/20',
  },
  PROCESSING_ERROR: {
    icon: AlertTriangle,
    colorClass: 'text-red-500',
    bgClass: 'bg-red-50 dark:bg-red-950/20',
  },
  INFO: {
    icon: Info,
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-50 dark:bg-amber-950/20',
  },
}

// Configurações especializadas por subtype de roteamento
const ROUTING_SUBTYPE_CONFIG: Partial<
  Record<ToolSuccessSubtype | InfoSubtype, EventStyleConfig>
> = {
  AGENT_TRANSFER: {
    icon: ArrowRightLeft,
    colorClass: 'text-blue-500',
    bgClass: 'bg-blue-50 dark:bg-blue-950/20',
  },
  ROUTER_ASSIGNED: {
    icon: UserCheck,
    colorClass: 'text-kronos-purple',
    bgClass: 'bg-kronos-purple/5',
  },
  AGENT_TRANSFER_LOOP: {
    icon: ShieldAlert,
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-50 dark:bg-orange-950/20',
  },
  EMPTY_RESPONSE: {
    icon: MessageSquareOff,
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted/50',
  },
  // Visual roxo para distinguir de eventos INFO genéricos (amber) — sinaliza progressão de fluxo
  STEP_ADVANCED: {
    icon: ArrowRightLeft,
    colorClass: 'text-kronos-purple',
    bgClass: 'bg-kronos-purple/5',
  },
}

// Resolve o subtype a partir dos dados do evento (toolName para TOOL_SUCCESS, content para INFO)
function resolveSubtype(
  type: ConversationEventType,
  toolName: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined,
): ToolSuccessSubtype | InfoSubtype | null {
  if (type === 'TOOL_SUCCESS' && toolName === 'transfer_to_agent') return 'AGENT_TRANSFER'

  // Para eventos INFO, o subtype vem nos metadados
  const subtype = metadata?.subtype as string | undefined
  if (type === 'INFO' && subtype === 'ROUTER_ASSIGNED') return 'ROUTER_ASSIGNED'
  if (type === 'INFO' && subtype === 'AGENT_TRANSFER_LOOP') return 'AGENT_TRANSFER_LOOP'
  if (type === 'INFO' && subtype === 'EMPTY_RESPONSE') return 'EMPTY_RESPONSE'
  if (type === 'INFO' && subtype === 'STEP_ADVANCED') return 'STEP_ADVANCED'

  return null
}

export function ConversationEventBubble({
  type,
  content,
  createdAt,
  toolName,
  metadata,
}: ConversationEventBubbleProps) {
  const subtype = resolveSubtype(type, toolName, metadata)
  const config =
    (subtype ? ROUTING_SUBTYPE_CONFIG[subtype] : undefined) ?? BASE_EVENT_CONFIG[type]

  const Icon = config.icon
  const timestamp = new Date(createdAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <div className="h-px flex-1 bg-border/30" />
      <div
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs text-muted-foreground ${config.bgClass}`}
      >
        <Icon className={`h-3.5 w-3.5 shrink-0 ${config.colorClass}`} />
        <span>{content}</span>
        <span className="text-[10px] opacity-60">{timestamp}</span>
      </div>
      <div className="h-px flex-1 bg-border/30" />
    </div>
  )
}
