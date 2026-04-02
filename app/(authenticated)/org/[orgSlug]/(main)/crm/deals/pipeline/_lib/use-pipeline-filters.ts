'use client'

import { useQueryStates, parseAsString, parseAsFloat, parseAsStringLiteral, parseAsArrayOf } from 'nuqs'
import { useCallback, useMemo } from 'react'
import type { DealStatus, DealPriority } from '@prisma/client'
import type { PipelineFilters } from './pipeline-filters'

const SORT_OPTIONS = [
  'created-desc',
  'created-asc',
  'value-desc',
  'value-asc',
  'priority-desc',
  'title-asc',
] as const

export type SortOption = (typeof SORT_OPTIONS)[number]

// Parsers de filtros avançados
const filtersParsers = {
  status: parseAsArrayOf(parseAsString).withDefault([]),
  priority: parseAsArrayOf(parseAsString).withDefault([]),
  dateFrom: parseAsString,
  dateTo: parseAsString,
  valueMin: parseAsFloat,
  valueMax: parseAsFloat,
}

// Parsers de toolbar (sort + assignee)
const toolbarParsers = {
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('created-desc'),
  assignee: parseAsArrayOf(parseAsString).withDefault([]),
}

export function usePipelineFilters() {
  const [filterParams, setFilterParams] = useQueryStates(filtersParsers, {
    history: 'replace',
  })

  const [toolbarParams, setToolbarParams] = useQueryStates(toolbarParsers, {
    history: 'replace',
  })

  // Converte para a interface PipelineFilters usada pelos componentes de filtro
  const filters = useMemo<PipelineFilters>(
    () => ({
      status: filterParams.status as DealStatus[],
      priority: filterParams.priority as DealPriority[],
      createdAtFrom: filterParams.dateFrom
        ? new Date(filterParams.dateFrom)
        : null,
      createdAtTo: filterParams.dateTo
        ? new Date(filterParams.dateTo)
        : null,
      valueMin: filterParams.valueMin,
      valueMax: filterParams.valueMax,
    }),
    [filterParams],
  )

  // Mantém a mesma assinatura que PipelineFiltersSheet e FilterBadges esperam
  const setFilters = useCallback(
    (newFilters: Partial<PipelineFilters>) => {
      const merged = { ...filters, ...newFilters }

      setFilterParams({
        status: merged.status.length > 0 ? merged.status : null,
        priority: merged.priority.length > 0 ? merged.priority : null,
        dateFrom: merged.createdAtFrom
          ? merged.createdAtFrom.toISOString().split('T')[0]
          : null,
        dateTo: merged.createdAtTo
          ? merged.createdAtTo.toISOString().split('T')[0]
          : null,
        valueMin: merged.valueMin,
        valueMax: merged.valueMax,
      })
    },
    [filters, setFilterParams],
  )

  const clearFilters = useCallback(() => {
    setFilterParams(null)
  }, [setFilterParams])

  const setSortBy = useCallback(
    (value: SortOption) => {
      setToolbarParams({ sort: value })
    },
    [setToolbarParams],
  )

  const setAssignees = useCallback(
    (values: string[]) => {
      setToolbarParams({ assignee: values.length > 0 ? values : null })
    },
    [setToolbarParams],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.createdAtFrom || filters.createdAtTo) count++
    if (filters.valueMin !== null || filters.valueMax !== null) count++
    return count
  }, [filters])

  return {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
    sortBy: toolbarParams.sort,
    setSortBy,
    assignees: toolbarParams.assignee,
    setAssignees,
  }
}
