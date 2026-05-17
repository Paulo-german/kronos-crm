import type { LifecycleStage } from '@prisma/client'
import type { ScoreWeights } from './health-score-types'

export const BATCH_SIZE = 200

export const SCORE_RED_MAX = 39
export const SCORE_YELLOW_MAX = 69

// Planos com acesso ao health score (Scale+) — slug do Plan no banco
export const SCORE_ELIGIBLE_PRODUCT_KEYS = ['scale', 'enterprise'] as const

export const STAGE_WEIGHTS: Record<LifecycleStage, ScoreWeights> = {
  LEAD: {
    recency: 0.5,
    dealActivity: 0.0,
    repurchaseFrequency: 0.0,
    daysSinceLastPurchase: 0.0,
    ltv: 0.1,
    agentEngagement: 0.4,
  },
  QUALIFIED: {
    recency: 0.5,
    dealActivity: 0.0,
    repurchaseFrequency: 0.0,
    daysSinceLastPurchase: 0.0,
    ltv: 0.1,
    agentEngagement: 0.4,
  },
  OPPORTUNITY: {
    recency: 0.3,
    dealActivity: 0.4,
    repurchaseFrequency: 0.0,
    daysSinceLastPurchase: 0.0,
    ltv: 0.1,
    agentEngagement: 0.2,
  },
  CUSTOMER: {
    recency: 0.2,
    dealActivity: 0.0,
    repurchaseFrequency: 0.35,
    daysSinceLastPurchase: 0.25,
    ltv: 0.15,
    agentEngagement: 0.05,
  },
}

export const NORMALIZATION = {
  recency: { excellentDays: 0, failingDays: 90 },
  dealActivity: { excellentDays: 0, failingDays: 30 },
  daysSinceLastPurchase: { excellentDays: 0, failingDays: 180 },
} as const
