import type { GoalDto, GoalProgress } from '@/_data-access/goal/shared/goal-types'

export interface GoalProgressCardProps {
  goal: GoalDto
  progress: GoalProgress
  showBreakdown?: boolean
  variant?: 'default' | 'compact'
  primaryAction?: { label: string; href: string }
}
