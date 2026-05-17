// IMPORTANTE: este arquivo é compartilhado entre server e client (preview da janela de período).
// NÃO adicione `import 'server-only'` nem dependências de server (db, next/cache, etc.).

import { GoalPeriod } from '@prisma/client'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  addMilliseconds,
} from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export interface GoalPeriodWindow {
  periodStart: Date
  periodEnd: Date
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo'
const WEEK_STARTS_ON_MONDAY = 1

/**
 * Calcula a janela [periodStart, periodEnd) para uma meta.
 * periodEnd é exclusivo — somamos 1ms ao endOf (inclusivo) para virar o instante do próximo período.
 */
export function computeGoalPeriod(
  period: GoalPeriod,
  reference: Date,
  timezone: string = DEFAULT_TIMEZONE,
): GoalPeriodWindow {
  const zonedRef = toZonedTime(reference, timezone)

  const getRange = (): { start: Date; end: Date } => {
    if (period === 'WEEKLY') return { start: startOfWeek(zonedRef, { weekStartsOn: WEEK_STARTS_ON_MONDAY }), end: endOfWeek(zonedRef, { weekStartsOn: WEEK_STARTS_ON_MONDAY }) }
    if (period === 'MONTHLY') return { start: startOfMonth(zonedRef), end: endOfMonth(zonedRef) }
    if (period === 'QUARTERLY') return { start: startOfQuarter(zonedRef), end: endOfQuarter(zonedRef) }
    return { start: startOfYear(zonedRef), end: endOfYear(zonedRef) }
  }

  const { start, end } = getRange()

  return {
    periodStart: fromZonedTime(start, timezone),
    periodEnd: addMilliseconds(fromZonedTime(end, timezone), 1),
  }
}
