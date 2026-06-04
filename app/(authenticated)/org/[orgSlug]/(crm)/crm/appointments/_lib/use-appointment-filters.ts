'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import type { AppointmentStatus } from '@prisma/client'
import type { AppointmentFilters } from './appointment-filters'
import { DEFAULT_APPOINTMENT_FILTERS } from './appointment-filters'

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function useAppointmentFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = useMemo<AppointmentFilters>(() => {
    const statusParam = searchParams.get('status')
    const dateFromParam = searchParams.get('dateFrom')
    const dateToParam = searchParams.get('dateTo')

    return {
      status: statusParam
        ? (statusParam.split(',') as AppointmentStatus[])
        : DEFAULT_APPOINTMENT_FILTERS.status,
      dateFrom: dateFromParam ? parseLocalDate(dateFromParam) : null,
      dateTo: dateToParam ? parseLocalDate(dateToParam) : null,
    }
  }, [searchParams])

  const setFilters = useCallback(
    (newFilters: Partial<AppointmentFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...newFilters }

      // Atualiza ou remove o parâmetro de status
      if (merged.status.length > 0) {
        params.set('status', merged.status.join(','))
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

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    ;['status', 'dateFrom', 'dateTo'].forEach((param) => params.delete(param))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
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
