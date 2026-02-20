'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { DealStatus, DealPriority } from '@prisma/client'
import { PipelineFilters } from './pipeline-filters'

export function usePipelineFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = useMemo<PipelineFilters>(() => {
    const statusParam = searchParams.get('status')
    const priorityParam = searchParams.get('priority')
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')
    const valueMinParam = searchParams.get('valueMin')
    const valueMaxParam = searchParams.get('valueMax')

    return {
      status: statusParam ? (statusParam.split(',') as DealStatus[]) : [],
      priority: priorityParam
        ? (priorityParam.split(',') as DealPriority[])
        : [],
      expectedCloseDateFrom: dateFromParam ? new Date(dateFromParam) : null,
      expectedCloseDateTo: dateToParam ? new Date(dateToParam) : null,
      valueMin: valueMinParam ? Number(valueMinParam) : null,
      valueMax: valueMaxParam ? Number(valueMaxParam) : null,
    }
  }, [searchParams])

  const setFilters = useCallback(
    (newFilters: Partial<PipelineFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...newFilters }

      // Atualiza ou remove cada parâmetro
      if (merged.status.length > 0) {
        params.set('status', merged.status.join(','))
      } else {
        params.delete('status')
      }

      if (merged.priority.length > 0) {
        params.set('priority', merged.priority.join(','))
      } else {
        params.delete('priority')
      }

      if (merged.expectedCloseDateFrom) {
        params.set(
          'dateFrom',
          merged.expectedCloseDateFrom.toISOString().split('T')[0],
        )
      } else {
        params.delete('dateFrom')
      }

      if (merged.expectedCloseDateTo) {
        params.set(
          'dateTo',
          merged.expectedCloseDateTo.toISOString().split('T')[0],
        )
      } else {
        params.delete('dateTo')
      }

      if (merged.valueMin !== null) {
        params.set('valueMin', String(merged.valueMin))
      } else {
        params.delete('valueMin')
      }

      if (merged.valueMax !== null) {
        params.set('valueMax', String(merged.valueMax))
      } else {
        params.delete('valueMax')
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    ;['status', 'priority', 'dateFrom', 'dateTo', 'valueMin', 'valueMax'].forEach(
      (p) => params.delete(p),
    )
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.priority.length > 0) count++
    if (filters.expectedCloseDateFrom || filters.expectedCloseDateTo) count++
    if (filters.valueMin !== null || filters.valueMax !== null) count++
    return count
  }, [filters])

  return {
    filters,
    setFilters,
    clearFilters,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  }
}
