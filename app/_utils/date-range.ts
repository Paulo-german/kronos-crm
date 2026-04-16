import {
  parse,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  subDays,
  subMonths,
  differenceInMilliseconds,
} from 'date-fns'
import type { DateRange } from '@/_data-access/dashboard/types'

const URL_DATE_FORMAT = 'yyyy-MM-dd'

export function parseDateRange(start?: string, end?: string): DateRange {
  const now = new Date()

  // Usamos `parse` (date-fns) em vez de `new Date(string)` para evitar o
  // shift de timezone do parser nativo, que interpreta "yyyy-MM-dd" como
  // UTC midnight. `startOfDay`/`endOfDay` normalizam para que o range cubra
  // o dia inteiro (00:00:00.000 → 23:59:59.999) nas queries `gte/lte` do
  // Prisma, cobrindo também seleções de 1 dia (start=end).
  return {
    start: start
      ? startOfDay(parse(start, URL_DATE_FORMAT, now))
      : startOfMonth(now),
    end: end ? endOfDay(parse(end, URL_DATE_FORMAT, now)) : endOfMonth(now),
  }
}

export function getPreviousPeriod(dateRange: DateRange): DateRange {
  const durationMs = differenceInMilliseconds(dateRange.end, dateRange.start)

  return {
    start: new Date(dateRange.start.getTime() - durationMs),
    end: new Date(dateRange.start.getTime() - 1),
  }
}

export function formatVariation(
  current: number,
  previous: number,
): { value: string; isPositive: boolean } {
  if (previous === 0) {
    if (current === 0) return { value: '0%', isPositive: true }
    return { value: '+100%', isPositive: true }
  }

  const change = ((current - previous) / previous) * 100
  const isPositive = change >= 0
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

  return { value: formatted, isPositive }
}

export function getDateRangePresets(): Array<{
  label: string
  start: Date
  end: Date
}> {
  const now = new Date()
  return [
    {
      label: 'Últimos 7 dias',
      start: subDays(now, 6),
      end: now,
    },
    {
      label: 'Este mês',
      start: startOfMonth(now),
      end: endOfMonth(now),
    },
    {
      label: 'Últimos 30 dias',
      start: subMonths(now, 1),
      end: now,
    },
    {
      label: 'Último trimestre',
      start: subMonths(startOfMonth(now), 2),
      end: endOfMonth(now),
    },
    {
      label: 'Este ano',
      start: startOfYear(now),
      end: endOfMonth(now),
    },
  ]
}
