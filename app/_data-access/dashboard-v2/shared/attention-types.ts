/**
 * Types compartilhados pelos 3 cards de "Atenção Necessária" do dashboard v2:
 * - Oportunidades estagnadas (OPPORTUNITY com deals sem update)
 * - Clientes em risco (CUSTOMER com health baixo ou DORMANT)
 * - Leads aguardando (LEAD com firstCaptureAt antigo)
 *
 * Este arquivo NÃO usa `server-only` porque é importado também pela camada de UI
 * (client components que renderizam os cards).
 */

export interface AttentionContactDto {
  contactId: string
  contactName: string
  contactAvatarUrl: string | null
  primaryMetric: string
  primaryMetricVariant: 'default' | 'warning' | 'destructive'
  secondaryMetric: string | null
  // Sinaliza score desatualizado (apenas em at-risk customers — cron de scoring falhou)
  isScoreStale?: boolean
}

export interface AttentionListDto {
  contacts: AttentionContactDto[]
  // Total absoluto na fila (não apenas o slice exibido) — usado no footer "ver todos"
  totalCount: number
}
