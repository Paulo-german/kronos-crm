'use client'

import {
  useQueryStates,
  parseAsString,
  parseAsFloat,
  parseAsStringLiteral,
  parseAsArrayOf,
  parseAsInteger,
} from 'nuqs'
import { useCallback, useMemo } from 'react'
import type { DealStatus, DealPriority } from '@prisma/client'
import type { DealFilters } from '../../_lib/deal-filters'
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from './deal-list-params'

const SORT_OPTIONS = [
  'created-desc',
  'created-asc',
  'value-desc',
  'value-asc',
  'priority-desc',
  'title-asc',
] as const

export type DealListSortOption = (typeof SORT_OPTIONS)[number]

// Parsers de filtros avançados (sheet)
const filtersParsers = {
  status: parseAsArrayOf(parseAsString).withDefault([]),
  priority: parseAsArrayOf(parseAsString).withDefault([]),
  dateFrom: parseAsString,
  dateTo: parseAsString,
  valueMin: parseAsFloat,
  valueMax: parseAsFloat,
}

// Parsers de toolbar e paginação
const toolbarParsers = {
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('created-desc'),
  assignedTo: parseAsString,
  search: parseAsString,
  page: parseAsInteger.withDefault(1),
  pageSize: parseAsStringLiteral(PAGE_SIZE_OPTIONS.map(String) as [string, ...string[]]).withDefault(
    String(DEFAULT_PAGE_SIZE),
  ),
  // default null = usa pipeline default no server
  pipelineId: parseAsString,
}

export function useDealListFilters() {
  const [filterParams, setFilterParams] = useQueryStates(filtersParsers, {
    history: 'replace',
    shallow: false,
  })

  const [toolbarParams, setToolbarParams] = useQueryStates(toolbarParsers, {
    history: 'replace',
    shallow: false,
  })

  // Converte para a interface DealFilters usada pelos componentes de filtro
  const filters = useMemo<DealFilters>(
    () => ({
      status: filterParams.status as DealStatus[],
      priority: filterParams.priority as DealPriority[],
      createdAtFrom: filterParams.dateFrom ? new Date(filterParams.dateFrom) : null,
      createdAtTo: filterParams.dateTo ? new Date(filterParams.dateTo) : null,
      valueMin: filterParams.valueMin,
      valueMax: filterParams.valueMax,
    }),
    [filterParams],
  )

  // Aplica filtros da sheet, sempre resetando para página 1
  const setFilters = useCallback(
    (newFilters: Partial<DealFilters>) => {
      const merged = { ...filters, ...newFilters }

      setFilterParams({
        status: merged.status.length > 0 ? merged.status : null,
        priority: merged.priority.length > 0 ? merged.priority : null,
        dateFrom: merged.createdAtFrom ? merged.createdAtFrom.toISOString().split('T')[0] : null,
        dateTo: merged.createdAtTo ? merged.createdAtTo.toISOString().split('T')[0] : null,
        valueMin: merged.valueMin,
        valueMax: merged.valueMax,
      })

      // Sempre resetar para página 1 ao mudar filtros
      setToolbarParams((prev) => ({ ...prev, page: 1 }))
    },
    [filters, setFilterParams, setToolbarParams],
  )

  const clearFilters = useCallback(() => {
    setFilterParams(null)
    setToolbarParams((prev) => ({ ...prev, page: 1 }))
  }, [setFilterParams, setToolbarParams])

  const setSort = useCallback(
    (value: DealListSortOption) => {
      setToolbarParams((prev) => ({ ...prev, sort: value, page: 1 }))
    },
    [setToolbarParams],
  )

  const setAssignedTo = useCallback(
    (value: string | null) => {
      setToolbarParams((prev) => ({ ...prev, assignedTo: value, page: 1 }))
    },
    [setToolbarParams],
  )

  const setSearch = useCallback(
    (value: string | null) => {
      setToolbarParams((prev) => ({ ...prev, search: value, page: 1 }))
    },
    [setToolbarParams],
  )

  const setPage = useCallback(
    (value: number) => {
      setToolbarParams((prev) => ({ ...prev, page: value }))
    },
    [setToolbarParams],
  )

  const setPageSize = useCallback(
    (value: number) => {
      setToolbarParams((prev) => ({ ...prev, pageSize: String(value), page: 1 }))
    },
    [setToolbarParams],
  )

  const setPipelineId = useCallback(
    (value: string | null) => {
      // Troca de funil reseta para página 1 para evitar página fora do range
      setToolbarParams((prev) => ({ ...prev, pipelineId: value, page: 1 }))
    },
    [setToolbarParams],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.createdAtFrom ?? filters.createdAtTo) count++
    if (filters.valueMin !== null || filters.valueMax !== null) count++
    return count
  }, [filters])

  return {
    // Filter state
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    // Toolbar state
    sort: toolbarParams.sort,
    setSort,
    assignedTo: toolbarParams.assignedTo ?? null,
    setAssignedTo,
    search: toolbarParams.search ?? '',
    setSearch,
    // Pagination state
    page: toolbarParams.page,
    setPage,
    pageSize: Number(toolbarParams.pageSize),
    setPageSize,
    // Pipeline filter
    pipelineId: toolbarParams.pipelineId ?? null,
    setPipelineId,
  }
}
