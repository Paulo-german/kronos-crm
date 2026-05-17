import type { LifecycleStage } from '@prisma/client'

export interface ScoreWeights {
  recency: number
  dealActivity: number
  repurchaseFrequency: number
  daysSinceLastPurchase: number
  ltv: number
  agentEngagement: number
}

export interface ScoreComponents {
  recency: number
  dealActivity: number
  repurchaseFrequency: number
  daysSinceLastPurchase: number
  ltv: number
  agentEngagement: number
}

export interface ContactSignals {
  daysSinceLastInteraction: number | null
  daysSinceLastDealActivity: number | null
  daysSinceLastPurchase: number | null
  repurchaseCount12m: number
  ltvBrl: number // SUM(d.value + mrr*12) dos deals WON
  agentEngagementEventsLast30d: number
}

export interface ScoreSnapshot {
  stage: LifecycleStage
  components: ScoreComponents
  weights: ScoreWeights
  mainDriver: string
  mainDriverKey: keyof ScoreComponents
  rawSignals: ContactSignals
}

export interface HealthScoreResult {
  contactId: string
  organizationId: string
  score: number
  snapshot: ScoreSnapshot
}

export interface ContactSignalRow {
  contactId: string
  lifecycleStage: LifecycleStage
  daysSinceLastInteraction: number | null
  daysSinceLastDealActivity: number | null
  daysSinceLastPurchase: number | null
  repurchaseCount12m: number
  ltvBrl: number
  agentEngagementEventsLast30d: number
}
