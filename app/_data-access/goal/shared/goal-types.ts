import type { GoalType, GoalScope, GoalPeriod } from '@prisma/client'

export interface GoalDto {
  id: string
  type: GoalType
  scope: GoalScope
  period: GoalPeriod
  periodStart: Date
  periodEnd: Date
  targetUserId: string | null
  targetUserName: string | null
  targetPipelineId: string | null
  targetPipelineName: string | null
  targetValue: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface GoalProgressBreakdown {
  oneTimeRevenue: number | null
  recurringRevenue: number | null
}

export interface GoalProgress {
  actual: number
  target: number
  percent: number
  remaining: number
  daysRemaining: number
  breakdown: GoalProgressBreakdown
}

export interface GoalWithProgressDto extends GoalDto {
  progress: GoalProgress
}

export interface GoalSuggestionResult {
  suggested: number
  monthlyValues: number[]
  hasEnoughData: boolean
}
