'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { LifecycleStage, CustomerStatus } from '@prisma/client'
import { LifecycleStage as LifecycleStageEnum, CustomerStatus as CustomerStatusEnum } from '@prisma/client'
import type { ContactFilters } from './contact-filters'

const VALID_STAGES = new Set<string>(Object.values(LifecycleStageEnum))
const VALID_STATUSES = new Set<string>(Object.values(CustomerStatusEnum))

function parseCsvStages(csv: string | null): LifecycleStage[] {
  if (!csv) return []
  return csv.split(',').filter((value): value is LifecycleStage => VALID_STAGES.has(value))
}

function parseCsvStatuses(csv: string | null): CustomerStatus[] {
  if (!csv) return []
  return csv.split(',').filter((value): value is CustomerStatus => VALID_STATUSES.has(value))
}

function parseScore(raw: string | null): number | null {
  if (!raw) return null
  const value = Number(raw)
  return Number.isNaN(value) ? null : value
}

export function useContactFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const filters = useMemo<ContactFilters>(() => {
    const companyIdParam = searchParams.get('companyId')
    const isDecisionMakerParam = searchParams.get('isDecisionMaker')
    const hasDealsParam = searchParams.get('hasDeals')

    return {
      companyId: companyIdParam ?? null,
      isDecisionMaker:
        isDecisionMakerParam === 'true'
          ? true
          : isDecisionMakerParam === 'false'
            ? false
            : null,
      hasDeals:
        hasDealsParam === 'true'
          ? true
          : hasDealsParam === 'false'
            ? false
            : null,
      lifecycleStages: parseCsvStages(searchParams.get('lifecycleStages')),
      customerStatuses: parseCsvStatuses(searchParams.get('customerStatuses')),
      healthScoreMin: parseScore(searchParams.get('healthScoreMin')),
      healthScoreMax: parseScore(searchParams.get('healthScoreMax')),
    }
  }, [searchParams])

  const setFilters = useCallback(
    (newFilters: Partial<ContactFilters>) => {
      const params = new URLSearchParams(searchParams.toString())
      const merged = { ...filters, ...newFilters }

      // Sempre resetar para página 1 ao mudar filtros
      params.set('page', '1')

      if (merged.companyId) {
        params.set('companyId', merged.companyId)
      } else {
        params.delete('companyId')
      }

      if (merged.isDecisionMaker !== null && merged.isDecisionMaker !== undefined) {
        params.set('isDecisionMaker', String(merged.isDecisionMaker))
      } else {
        params.delete('isDecisionMaker')
      }

      if (merged.hasDeals !== null && merged.hasDeals !== undefined) {
        params.set('hasDeals', String(merged.hasDeals))
      } else {
        params.delete('hasDeals')
      }

      if (merged.lifecycleStages.length > 0) {
        params.set('lifecycleStages', merged.lifecycleStages.join(','))
      } else {
        params.delete('lifecycleStages')
      }

      if (merged.customerStatuses.length > 0) {
        params.set('customerStatuses', merged.customerStatuses.join(','))
      } else {
        params.delete('customerStatuses')
      }

      if (merged.healthScoreMin !== null && merged.healthScoreMin !== undefined) {
        params.set('healthScoreMin', String(merged.healthScoreMin))
      } else {
        params.delete('healthScoreMin')
      }

      if (merged.healthScoreMax !== null && merged.healthScoreMax !== undefined) {
        params.set('healthScoreMax', String(merged.healthScoreMax))
      } else {
        params.delete('healthScoreMax')
      }

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    ;[
      'companyId',
      'isDecisionMaker',
      'hasDeals',
      'lifecycleStages',
      'customerStatuses',
      'healthScoreMin',
      'healthScoreMax',
    ].forEach((param) => params.delete(param))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.companyId) count++
    if (filters.isDecisionMaker !== null) count++
    if (filters.hasDeals !== null) count++
    if (filters.lifecycleStages.length > 0) count++
    if (filters.customerStatuses.length > 0) count++
    if (filters.healthScoreMin !== null || filters.healthScoreMax !== null) count++
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
