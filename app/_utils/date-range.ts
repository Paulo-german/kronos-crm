import {
  startOfMonth,
  endOfMonth,
  subMonths,
  differenceInMilliseconds,
} from 'date-fns'
import type { DateRange } from '@/_data-access/dashboard/types'

export function parseDateRange(start?: string, end?: string): DateRange {
  const now = new Date()

  return {
    start: start ? new Date(start) : startOfMonth(now),
    end: end ? new Date(end) : endOfMonth(now),
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
  ]
}
