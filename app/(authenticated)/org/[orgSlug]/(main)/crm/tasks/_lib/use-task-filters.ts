'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { TaskType } from '@prisma/client'
import type { TaskFilters } from './task-filters'
import { DEFAULT_TASK_FILTERS } from './task-filters'

export function useTaskFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = useMemo<TaskFilters>(() => {
    const typesParam = searchParams.get('types')
    const statusParam = searchParams.get('status')
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')

    const rawStatus = statusParam as TaskFilters['status'] | null
    const validStatus: TaskFilters['status'] =
      rawStatus === 'pending' || rawStatus === 'completed'
        ? rawStatus
        : DEFAULT_TASK_FILTERS.status

    return {
      types: typesParam
        ? (typesParam.split(',') as TaskType[])
        : DEFAULT_TASK_FILTERS.types,
      status: validStatus,
      dateFrom: dateFromParam ? new Date(dateFromParam) : null,
      dateTo: dateToParam ? new Date(dateToParam) : null,
    }
  }, [searchParams])

  const setFilters = useCallback(
    (newFilters: Partial<TaskFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...newFilters }

      // Atualiza ou remove o parâmetro de tipos
      if (merged.types.length > 0) {
        params.set('types', merged.types.join(','))
      } else {
        params.delete('types')
      }

      // Atualiza ou remove o parâmetro de status (omite 'all' da URL)
      if (merged.status !== 'all') {
        params.set('status', merged.status)
      } else {
        params.delete('status')
      }

      // Atualiza ou remove o parâmetro de data inicial
      if (merged.dateFrom) {
        params.set('dateFrom', merged.dateFrom.toISOString().split('T')[0])
      } else {
        params.delete('dateFrom')
      }

      // Atualiza ou remove o parâmetro de data final
      if (merged.dateTo) {
        params.set('dateTo', merged.dateTo.toISOString().split('T')[0])
      } else {
        params.delete('dateTo')
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    ;['types', 'status', 'dateFrom', 'dateTo'].forEach((param) =>
      params.delete(param),
    )
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.types.length > 0) count++
    if (filters.status !== 'all') count++
    if (filters.dateFrom || filters.dateTo) count++
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
