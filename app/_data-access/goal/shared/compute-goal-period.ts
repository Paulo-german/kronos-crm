// IMPORTANTE: este arquivo é compartilhado entre server e client (preview da janela de período).
// NÃO adicione `import 'server-only'` nem dependências de server (db, next/cache, etc.).

import { GoalPeriod } from '@prisma/client'
import { TZDate } from '@date-fns/tz'
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
  const ref = new TZDate(reference, timezone)

  const getRange = (): { start: TZDate; end: TZDate } => {
    if (period === 'WEEKLY')
      return {
        start: startOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON_MONDAY }),
        end: endOfWeek(ref, { weekStartsOn: WEEK_STARTS_ON_MONDAY }),
      }
    if (period === 'MONTHLY') return { start: startOfMonth(ref), end: endOfMonth(ref) }
    if (period === 'QUARTERLY') return { start: startOfQuarter(ref), end: endOfQuarter(ref) }
    return { start: startOfYear(ref), end: endOfYear(ref) }
  }

  const { start, end } = getRange()

  return {
    periodStart: new Date(start.getTime()),
    periodEnd: addMilliseconds(new Date(end.getTime()), 1),
  }
}
