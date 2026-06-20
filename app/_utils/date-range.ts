import {
  parse,
  isValid,
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
  const defaultStart = startOfMonth(now)
  const defaultEnd = endOfMonth(now)

  // Usamos `parse` (date-fns) em vez de `new Date(string)` para evitar o
  // shift de timezone do parser nativo, que interpreta "yyyy-MM-dd" como
  // UTC midnight. `startOfDay`/`endOfDay` normalizam para que o range cubra
  // o dia inteiro (00:00:00.000 → 23:59:59.999) nas queries `gte/lte` do
  // Prisma, cobrindo também seleções de 1 dia (start=end).
  //
  // Entradas malformadas (ex.: ?start=abc, ?start=2026-13-99) produzem
  // `Invalid Date`, que ao virar `.toISOString()` na cache key lançaria
  // RangeError e derrubaria o report. Validamos com `isValid` e caímos no
  // default (mês corrente) quando inválido.
  let rangeStart = defaultStart
  if (start) {
    const parsed = startOfDay(parse(start, URL_DATE_FORMAT, now))
    if (isValid(parsed)) rangeStart = parsed
  }

  let rangeEnd = defaultEnd
  if (end) {
    const parsed = endOfDay(parse(end, URL_DATE_FORMAT, now))
    if (isValid(parsed)) rangeEnd = parsed
  }

  // Garante ordem cronológica. Um range invertido (start > end) gera
  // duração negativa em `getPreviousPeriod`, corrompendo as variações.
  if (rangeStart > rangeEnd) {
    return { start: defaultStart, end: defaultEnd }
  }

  return { start: rangeStart, end: rangeEnd }
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
): { value: string; isPositive: boolean; hasBaseline: boolean } {
  // `hasBaseline: false` sinaliza que não há base de comparação real
  // (período anterior zerado). A UI deve ocultar o badge nesses casos em
  // vez de exibir um "+100%"/"0%" enganoso — ex.: produto/canal que não
  // existia no período anterior apareceria como "cresceu 100%".
  if (previous === 0) {
    if (current === 0)
      return { value: '0%', isPositive: true, hasBaseline: false }
    return { value: '+100%', isPositive: true, hasBaseline: false }
  }

  const change = ((current - previous) / previous) * 100
  const isPositive = change >= 0
  const formatted = `${isPositive ? '+' : ''}${change.toFixed(1)}%`

  return { value: formatted, isPositive, hasBaseline: true }
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
