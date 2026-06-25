import type { ConversationStatus, InboxChannel } from '@prisma/client'

export interface InboxDashboardFilters {
  channel?: InboxChannel
  /** userId — filtrável apenas por elevated */
  assignee?: string
  labelId?: string
  status?: ConversationStatus
  aiVsHuman?: 'ai' | 'human'
}

/**
 * Alvo de SLA para a 1ª resposta, em minutos. 5 min é a referência usual para
 * atendimento por chat/WhatsApp — canais em que o cliente espera resposta quase
 * imediata. Mantido como constante (sem configuração por org) nesta fase.
 */
export const SLA_FIRST_RESPONSE_MINUTES = 5

export interface InboxKpiMetrics {
  openConversations: number
  resolvedConversations: number
  /** Tempo até primeira resposta (role=assistant), em ms — null se nenhuma conversa respondida */
  avgFirstResponseTimeMs: number | null
  /** 0-100: % de conversas respondidas cuja 1ª resposta ficou dentro do SLA — null se nenhuma respondida */
  firstResponseSlaRate: number | null
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
  prevFirstResponseSlaRate: number | null
  prevAvgResolutionTimeMs: number | null
  prevResponseRate: number
  prevMessagesReceived: number
  prevMessagesSent: number
}

export interface ConversationVolumeByDay {
  date: string // "2026-04-01"
  label: string // "01/04"
  opened: number
  resolved: number
}

export interface ChannelDistribution {
  channel: string // "WHATSAPP" | "WEB_CHAT"
  count: number
  /** Tempo médio de 1ª resposta (ms) das conversas deste canal — null se nenhuma respondida */
  avgFirstResponseTimeMs: number | null
}

export interface HourlyHeatmapEntry {
  dayOfWeek: number // 0=Dom, 6=Sab
  hour: number // 0-23
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
  /** Tempo médio de resolução (ms) das conversas resolvidas que tiveram IA — null se nenhuma */
  aiAvgResolutionMs: number | null
  /** Tempo médio de resolução (ms) das conversas resolvidas só por humano — null se nenhuma */
  humanAvgResolutionMs: number | null
}
