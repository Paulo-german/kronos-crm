/**
 * Constantes do dashboard lifecycle-first (`/dashboard/v2`).
 *
 * Centralizar facilita auditoria e futura configuração por org (ver Open Decision 1
 * do PLAN-dashboard-operational-redesign.md).
 */

// Health score abaixo deste valor classifica CUSTOMER como "em risco" (Bloco 1 e Bloco 2)
export const HEALTH_SCORE_RISK_THRESHOLD = 50

// Dias após `scoredAt` para considerar o health score desatualizado (cron falhou)
export const SCORE_STALE_DAYS = 3

// Dias sem atualização de Deal para uma OPPORTUNITY ser considerada estagnada
export const STAGNANT_OPPORTUNITY_DAYS = 14

// Dias desde `firstCaptureAt` para um LEAD ser considerado "aguardando" qualificação
export const LEAD_WAITING_DAYS = 5

// Quantidade máxima de contatos exibidos em cada card de Atenção Necessária
export const ATTENTION_CARD_LIMIT = 5

// Janela usada na sub-info "novos leads na semana"
export const ATTENTION_NEW_LEADS_WEEK_DAYS = 7

// TTL (s) das queries do dashboard v2 — staleness curta por ser superfície operacional
export const DASHBOARD_V2_CACHE_REVALIDATE_S = 60

// Quantidade máxima de transições exibidas na timeline de Movimento Recente
export const RECENT_MOVEMENT_LIMIT = 15

// Janela default do DateRange quando não há query params (últimos 30 dias)
export const DASHBOARD_V2_DEFAULT_DAYS = 30

// Janela fixa (em meses) do gráfico de evolução do funil — independente do DateRange
export const LIFECYCLE_EVOLUTION_MONTHS = 12
