'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import type { TaskType } from '@prisma/client'
import type { TaskFilters } from './task-filters'
import { DEFAULT_TASK_FILTERS } from './task-filters'

// new Date("YYYY-MM-DD") trata a string como UTC midnight, deslocando um dia
// em timezones negativos (ex: Brasil UTC-3). Esta função cria a data no horário local.
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function useTaskFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = useMemo<TaskFilters>(() => {
    const typesParam = searchParams.get('types')
    const statusParam = searchParams.get('status')
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')
    const createdAtFromParam = searchParams.get('createdAtFrom')
    const createdAtToParam = searchParams.get('createdAtTo')

    const rawStatus = statusParam as TaskFilters['status'] | null
    const validStatus: TaskFilters['status'] =
      rawStatus === 'pending' || rawStatus === 'overdue' || rawStatus === 'completed'
        ? rawStatus
        : DEFAULT_TASK_FILTERS.status

    return {
      types: typesParam
        ? (typesParam.split(',') as TaskType[])
        : DEFAULT_TASK_FILTERS.types,
      status: validStatus,
      dateFrom: dateFromParam ? parseLocalDate(dateFromParam) : null,
      dateTo: dateToParam ? parseLocalDate(dateToParam) : null,
      createdAtFrom: createdAtFromParam ? parseLocalDate(createdAtFromParam) : null,
      createdAtTo: createdAtToParam ? parseLocalDate(createdAtToParam) : null,
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
        params.set('dateFrom', format(merged.dateFrom, 'yyyy-MM-dd'))
      } else {
        params.delete('dateFrom')
      }

      // Atualiza ou remove o parâmetro de data final
      if (merged.dateTo) {
        params.set('dateTo', format(merged.dateTo, 'yyyy-MM-dd'))
      } else {
        params.delete('dateTo')
      }

      if (merged.createdAtFrom) {
        params.set('createdAtFrom', format(merged.createdAtFrom, 'yyyy-MM-dd'))
      } else {
        params.delete('createdAtFrom')
      }

      if (merged.createdAtTo) {
        params.set('createdAtTo', format(merged.createdAtTo, 'yyyy-MM-dd'))
      } else {
        params.delete('createdAtTo')
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    ;['types', 'status', 'dateFrom', 'dateTo', 'createdAtFrom', 'createdAtTo'].forEach((param) =>
      params.delete(param),
    )
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.types.length > 0) count++
    if (filters.dateFrom || filters.dateTo) count++
    if (filters.createdAtFrom || filters.createdAtTo) count++
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
