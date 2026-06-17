import { format } from 'date-fns'
import type { DealFilters } from '../../_lib/deal-filters'
import type { SortOption } from './use-pipeline-filters'

/**
 * Input serializável (sem objetos Date) usado tanto na queryKey do React Query
 * quanto na URL das API routes. Centralizar a serialização aqui garante que client
 * e server interpretem os filtros do mesmo jeito.
 */
export interface PipelineQueryInput {
  sort: SortOption
  status: string[]
  priority: string[]
  assignee: string[]
  dateFrom: string | null
  dateTo: string | null
  valueMin: number | null
  valueMax: number | null
}

/** Converte os filtros/sort/assignees do client (com Dates) no input serializável. */
export function buildPipelineQueryInput(
  sort: SortOption,
  filters: DealFilters,
  assignees: string[],
): PipelineQueryInput {
  return {
    sort,
    status: filters.status,
    priority: filters.priority,
    assignee: assignees,
    dateFrom: filters.createdAtFrom
      ? format(filters.createdAtFrom, 'yyyy-MM-dd')
      : null,
    dateTo: filters.createdAtTo
      ? format(filters.createdAtTo, 'yyyy-MM-dd')
      : null,
    valueMin: filters.valueMin,
    valueMax: filters.valueMax,
  }
}

export function pipelineDealsKey(stageId: string, input: PipelineQueryInput) {
  return ['pipeline-deals', stageId, input] as const
}

export function pipelineAggregatesKey(
  pipelineId: string,
  input: PipelineQueryInput,
) {
  return ['pipeline-aggregates', pipelineId, input] as const
}

function appendFilterParams(
  params: URLSearchParams,
  input: PipelineQueryInput,
): void {
  params.set('sort', input.sort)
  if (input.status.length > 0) params.set('status', input.status.join(','))
  if (input.priority.length > 0)
    params.set('priority', input.priority.join(','))
  if (input.assignee.length > 0)
    params.set('assignee', input.assignee.join(','))
  if (input.dateFrom) params.set('dateFrom', input.dateFrom)
  if (input.dateTo) params.set('dateTo', input.dateTo)
  if (input.valueMin !== null) params.set('valueMin', String(input.valueMin))
  if (input.valueMax !== null) params.set('valueMax', String(input.valueMax))
}

export function buildPipelineDealsUrl(
  stageId: string,
  input: PipelineQueryInput,
  cursor?: string,
): string {
  const params = new URLSearchParams()
  params.set('stageId', stageId)
  params.set('limit', '20')
  if (cursor) params.set('cursor', cursor)
  appendFilterParams(params, input)
  return `/api/crm/pipeline/deals?${params.toString()}`
}

export function buildPipelineAggregatesUrl(
  pipelineId: string,
  stageIds: string[],
  input: PipelineQueryInput,
): string {
  const params = new URLSearchParams()
  params.set('pipelineId', pipelineId)
  params.set('stageIds', stageIds.join(','))
  appendFilterParams(params, input)
  return `/api/crm/pipeline/aggregates?${params.toString()}`
}
