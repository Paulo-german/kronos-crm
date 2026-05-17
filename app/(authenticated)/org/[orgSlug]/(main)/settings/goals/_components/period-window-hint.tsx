'use client'

import type { GoalPeriod } from '@prisma/client'
import { computeGoalPeriod } from '@/_data-access/goal/shared/compute-goal-period'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarRange } from 'lucide-react'

interface PeriodWindowHintProps {
  period: GoalPeriod
}

export function PeriodWindowHint({ period }: PeriodWindowHintProps) {
  const { periodStart, periodEnd } = computeGoalPeriod(period, new Date())

  const formatDate = (date: Date) =>
    format(date, 'dd/MM/yyyy', { locale: ptBR })

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <CalendarRange className="h-3.5 w-3.5 shrink-0" />
      Esta meta vale para: {formatDate(periodStart)} – {formatDate(periodEnd)}
    </p>
  )
}
