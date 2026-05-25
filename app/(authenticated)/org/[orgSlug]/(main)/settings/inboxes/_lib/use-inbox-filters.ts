'use client'

import { useQueryStates, parseAsArrayOf, parseAsString } from 'nuqs'
import { useCallback, useMemo } from 'react'
import type { InboxFilters } from './inbox-filters'

const filtersParsers = {
  connectionStatus: parseAsArrayOf(parseAsString).withDefault([]),
  provider: parseAsArrayOf(parseAsString).withDefault([]),
  channel: parseAsArrayOf(parseAsString).withDefault([]),
}

export function useInboxFilters() {
  const [params, setParams] = useQueryStates(filtersParsers, {
    history: 'replace',
  })

  const filters = useMemo<InboxFilters>(
    () => ({
      connectionStatus: params.connectionStatus as (
        | 'connected'
        | 'disconnected'
      )[],
      provider: params.provider,
      channel: params.channel,
    }),
    [params],
  )

  const setFilters = useCallback(
    (newFilters: Partial<InboxFilters>) => {
      const merged = { ...filters, ...newFilters }
      setParams({
        connectionStatus:
          merged.connectionStatus.length > 0
            ? merged.connectionStatus
            : null,
        provider: merged.provider.length > 0 ? merged.provider : null,
        channel: merged.channel.length > 0 ? merged.channel : null,
      })
    },
    [filters, setParams],
  )

  const clearFilters = useCallback(() => setParams(null), [setParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.connectionStatus.length > 0) count++
    if (filters.provider.length > 0) count++
    if (filters.channel.length > 0) count++
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
