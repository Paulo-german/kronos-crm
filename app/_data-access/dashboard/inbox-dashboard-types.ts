import type { ConversationStatus, InboxChannel } from '@prisma/client'

export interface InboxDashboardFilters {
  channel?: InboxChannel
  /** userId — filtrável apenas por elevated */
  assignee?: string
  labelId?: string
  status?: ConversationStatus
  aiVsHuman?: 'ai' | 'human'
}

export interface InboxKpiMetrics {
  openConversations: number
  resolvedConversations: number
  /** Tempo até primeira resposta (role=assistant), em ms — null se nenhuma conversa respondida */
  avgFirstResponseTimeMs: number | null
  /** Tempo médio de resolução (resolvedAt - createdAt), em ms — null se nenhuma resolvida */
  avgResolutionTimeMs: number | null
  /** 0-100: % de conversas com ao menos 1 mensagem de assistente */
  responseRate: number
  /** Total de mensagens recebidas (role=user) no período */
  messagesReceived: number
  /** Total de mensagens enviadas (role=assistant) no período */
  messagesSent: number
  /** Snapshot atual: OPEN com lastMessageRole=user — sem filtro de período */
  unansweredConversations: number

  // Período anterior para variação percentual nos KPI cards
  prevOpenConversations: number
  prevResolvedConversations: number
  prevAvgFirstResponseTimeMs: number | null
  prevAvgResolutionTimeMs: number | null
  prevResponseRate: number
  prevMessagesReceived: number
  prevMessagesSent: number
}

export interface ConversationVolumeByDay {
  date: string   // "2026-04-01"
  label: string  // "01/04"
  opened: number
  resolved: number
}

export interface ChannelDistribution {
  channel: string  // "WHATSAPP" | "WEB_CHAT"
  count: number
}

export interface HourlyHeatmapEntry {
  dayOfWeek: number  // 0=Dom, 6=Sab
  hour: number       // 0-23
  count: number
}

export interface AttendantPerformance {
  userId: string
  userName: string
  userAvatar: string | null
  conversationsHandled: number
  avgFirstResponseTimeMs: number | null
  /** 0-100 */
  resolutionRate: number
}

export interface TopLabel {
  labelId: string
  labelName: string
  labelColor: string
  count: number
}

export interface AiHumanBreakdown {
  aiConversations: number
  humanOnlyConversations: number
  handoffCount: number
  /** 0-100: AI resolvidas sem handoff / total AI */
  aiSuccessRate: number
}
