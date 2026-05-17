import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { SCORE_RED_MAX, SCORE_YELLOW_MAX } from '@/../trigger/lib/health-score-constants'
import type { ScoreBucketLabel } from '@/_data-access/copilot/shared/insights-types'

interface ScoreBadgeProps {
  score: number
  label?: ScoreBucketLabel
  size?: 'sm' | 'md' | 'lg'
}

function deriveLabelFromScore(score: number): ScoreBucketLabel {
  if (score <= SCORE_RED_MAX) return 'red'
  if (score <= SCORE_YELLOW_MAX) return 'yellow'
  return 'green'
}

const sizeClasses = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'min-w-[48px] px-3 py-1 text-sm font-bold text-center',
}

const colorClasses: Record<ScoreBucketLabel, string> = {
  red: 'border-transparent bg-destructive text-destructive-foreground shadow-sm',
  yellow: 'border-transparent bg-yellow-500 text-yellow-900 shadow-sm',
  green: 'border-transparent bg-green-500 text-white shadow-sm',
}

export function ScoreBadge({ score, label, size = 'md' }: ScoreBadgeProps) {
  const resolvedLabel = label ?? deriveLabelFromScore(score)

  return (
    <Badge
      className={cn(
        sizeClasses[size],
        colorClasses[resolvedLabel],
        'tabular-nums',
      )}
    >
      {score}
    </Badge>
  )
}
