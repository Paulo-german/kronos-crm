'use client'

import { useQueryState, parseAsString } from 'nuqs'
import { useCallback, useMemo } from 'react'
import { addDays, addMonths, addWeeks, format } from 'date-fns'

export type CalendarGranularity = 'month' | 'week' | 'day'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Data de referência do calendário, persistida em `?date=yyyy-MM-dd`.
 * Compartilhada pelas 3 sub-views — assim trocar a granularidade preserva o
 * período sendo visualizado. Ausência do param = hoje.
 */
export function useCalendarDate() {
  const [dateStr, setDateStr] = useQueryState('date', parseAsString)

  const referenceDate = useMemo(
    () => (dateStr ? parseLocalDate(dateStr) : new Date()),
    [dateStr],
  )

  const shift = useCallback(
    (granularity: CalendarGranularity, direction: 1 | -1) => {
      const base = dateStr ? parseLocalDate(dateStr) : new Date()
      const next =
        granularity === 'month'
          ? addMonths(base, direction)
          : granularity === 'week'
            ? addWeeks(base, direction)
            : addDays(base, direction)
      setDateStr(format(next, 'yyyy-MM-dd'))
    },
    [dateStr, setDateStr],
  )

  const goToPrev = useCallback(
    (granularity: CalendarGranularity) => shift(granularity, -1),
    [shift],
  )
  const goToNext = useCallback(
    (granularity: CalendarGranularity) => shift(granularity, 1),
    [shift],
  )
  const goToToday = useCallback(() => setDateStr(null), [setDateStr])

  return { referenceDate, goToPrev, goToNext, goToToday }
}
