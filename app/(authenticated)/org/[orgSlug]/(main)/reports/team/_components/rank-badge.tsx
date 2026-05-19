import { Trophy, Medal, Award } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface RankBadgeProps {
  position: number
}

interface RankConfig {
  icon: LucideIcon
  wrapperClass: string
  label: string
}

const RANK_CONFIG: Record<1 | 2 | 3, RankConfig> = {
  1: {
    icon: Trophy,
    wrapperClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400',
    label: '1º lugar',
  },
  2: {
    icon: Medal,
    wrapperClass: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    label: '2º lugar',
  },
  3: {
    icon: Award,
    wrapperClass: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400',
    label: '3º lugar',
  },
}

export function RankBadge({ position }: RankBadgeProps) {
  const config = RANK_CONFIG[position as 1 | 2 | 3]

  if (!config) {
    return <span className="font-medium text-muted-foreground">#{position}</span>
  }

  const Icon = config.icon

  return (
    <span
      aria-label={config.label}
      className={`inline-flex size-7 items-center justify-center rounded-full ${config.wrapperClass}`}
    >
      <Icon className="size-4" />
    </span>
  )
}
