import 'server-only'
import type { LifecycleStage, CustomerStatus } from '@prisma/client'

export type ScoreBucketLabel = 'red' | 'yellow' | 'green'

export interface InsightsBucketDto {
  /** Média simples (arredondada) dos healthScores do bucket — 0 quando total = 0 */
  score: number
  scoreLabel: ScoreBucketLabel
  total: number
  /** healthScore <= SCORE_RED_MAX (<= 39) */
  atRisk: number
  /** SCORE_RED_MAX < healthScore <= SCORE_YELLOW_MAX (40–69) */
  needsAttention: number
  /** healthScore > SCORE_YELLOW_MAX (>= 70) */
  healthy: number
}

export interface InsightsOverviewDto {
  customers: InsightsBucketDto
  pipeline: InsightsBucketDto
  counts: {
    stalledDeals: number
    reactivationCandidates: number
  }
  /** scoredAt mais recente entre todos os contatos avaliados — null quando nenhum foi avaliado */
  scoredAt: Date | null
}

export interface ContactAtRiskDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  lifecycleStage: LifecycleStage
  customerStatus: CustomerStatus
  healthScore: number
  scoredAt: Date
  /** Label legível do principal driver do score (extraído do snapshot mais recente) */
  mainDriver: string
  /** Chave canônica do driver (keyof ScoreComponents) */
  mainDriverKey: string
  /** LTV em reais — 0 quando não disponível neste data-access (sem agregação cara aqui) */
  ltvBrl: number
  assignedTo: string | null
  assignedToName: string | null
  daysSinceLastInteraction: number | null
}

export interface ContactsAtRiskParams {
  page: number
  pageSize: number
  stage?: LifecycleStage
  /** Default: SCORE_YELLOW_MAX (69) */
  scoreMax?: number
  sort: 'scoreAsc' | 'ltvDesc' | 'recencyAsc'
}

export interface ContactsAtRiskResult {
  data: ContactAtRiskDto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface StalledDealDto {
  id: string
  title: string
  value: number | null
  pipelineId: string
  pipelineName: string
  stageId: string
  stageName: string
  assignedTo: string | null
  assignedToName: string | null
  primaryContactId: string | null
  primaryContactName: string | null
  daysSinceLastActivity: number
}

export interface StalledDealsParams {
  page: number
  pageSize: number
  /** Default: 14 */
  staleAfterDays: number
  pipelineId?: string
  sort: 'staleDesc' | 'valueDesc'
}

export interface StalledDealsResult {
  data: StalledDealDto[]
  total: number
}

export interface ReactivationCandidateDto {
  id: string
  name: string
  email: string | null
  phone: string | null
  ltvBrl: number
  daysSinceLastPurchase: number | null
  lastWonDealTitle: string | null
  assignedTo: string | null
  assignedToName: string | null
}

export interface ReactivationParams {
  page: number
  pageSize: number
  /** Default: 500 (R$ 500) */
  minLtv: number
  sort: 'ltvDesc' | 'recentlyDormantDesc'
}

export interface ReactivationCandidatesResult {
  data: ReactivationCandidateDto[]
  total: number
}
