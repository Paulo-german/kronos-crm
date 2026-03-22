'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { ContactFilters } from './contact-filters'

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

      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, filters, router, pathname],
  )

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    // Resetar filtros e página ao limpar
    params.set('page', '1')
    ;['companyId', 'isDecisionMaker', 'hasDeals'].forEach((param) =>
      params.delete(param),
    )
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, router, pathname])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.companyId) count++
    if (filters.isDecisionMaker !== null) count++
    if (filters.hasDeals !== null) count++
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
