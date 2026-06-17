import 'server-only'
import type { Prisma, DealStatus, DealPriority } from '@prisma/client'

/**
 * Tipos e helpers compartilhados entre o data-access de paginação por coluna
 * (get-deals-by-pipeline-stage / get-pipeline-stage-aggregates) e as API routes
 * (/api/crm/pipeline/deals e /aggregates).
 *
 * Mantém a serialização dos filtros num único lugar para que a queryKey do React
 * Query (client) e o WHERE clause (server) nunca divirjam.
 */

export type DealSort =
  | 'created-desc'
  | 'created-asc'
  | 'value-desc'
  | 'value-asc'
  | 'priority-desc'
  | 'title-asc'

const SORT_VALUES: DealSort[] = [
  'created-desc',
  'created-asc',
  'value-desc',
  'value-asc',
  'priority-desc',
  'title-asc',
]

export function parseDealSort(value: string | null | undefined): DealSort {
  return SORT_VALUES.includes(value as DealSort)
    ? (value as DealSort)
    : 'created-desc'
}

export interface PipelineDealFilterInput {
  status?: DealStatus[]
  priority?: DealPriority[]
  /** Multi-select de responsável; só aplicado para usuários elevados (MEMBER é travado no próprio id). */
  assignee?: string[]
  dateFrom?: string
  dateTo?: string
  valueMin?: number
  valueMax?: number
}

/**
 * Ordenação de cursor estável: todo critério inclui `id` como tiebreaker para
 * que a paginação por cursor seja determinística mesmo com valores repetidos
 * (vários deals com mesmo value/priority/createdAt).
 *
 * `priority-desc` funciona nativamente porque o enum DealPriority é definido na
 * ordem low < medium < high < urgent no schema; `desc` ordena urgent → low.
 */
export function buildDealOrderBy(
  sort: DealSort,
): Prisma.DealOrderByWithRelationInput[] {
  switch (sort) {
    case 'created-asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }]
    case 'value-desc':
      return [{ value: 'desc' }, { id: 'desc' }]
    case 'value-asc':
      return [{ value: 'asc' }, { id: 'asc' }]
    case 'priority-desc':
      return [{ priority: 'desc' }, { id: 'desc' }]
    case 'title-asc':
      return [{ title: 'asc' }, { id: 'asc' }]
    case 'created-desc':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }]
  }
}

/** Lê os filtros de pipeline a partir dos query params de uma API route. */
export function parsePipelineDealFilters(
  searchParams: URLSearchParams,
): PipelineDealFilterInput {
  const csv = (key: string): string[] | undefined => {
    const raw = searchParams.get(key)
    if (!raw) return undefined
    const parts = raw.split(',').filter(Boolean)
    return parts.length > 0 ? parts : undefined
  }

  const num = (key: string): number | undefined => {
    const raw = searchParams.get(key)
    if (raw === null || raw === '') return undefined
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? parsed : undefined
  }

  return {
    status: csv('status') as DealStatus[] | undefined,
    priority: csv('priority') as DealPriority[] | undefined,
    assignee: csv('assignee'),
    dateFrom: searchParams.get('dateFrom') ?? undefined,
    dateTo: searchParams.get('dateTo') ?? undefined,
    valueMin: num('valueMin'),
    valueMax: num('valueMax'),
  }
}
