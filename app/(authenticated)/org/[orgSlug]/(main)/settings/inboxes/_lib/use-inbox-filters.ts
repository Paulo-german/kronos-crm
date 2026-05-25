'use client'

import { useQueryStates, parseAsString } from 'nuqs'
import { useCallback, useMemo } from 'react'

const filtersParsers = {
  connectionStatus: parseAsString.withDefault('all'),
  provider: parseAsString.withDefault('all'),
  channel: parseAsString.withDefault('all'),
}

export interface InboxFilterState {
  connectionStatus: string
  provider: string
  channel: string
}

export function useInboxFilters() {
  const [params, setParams] = useQueryStates(filtersParsers, {
    history: 'replace',
  })

  const filters: InboxFilterState = useMemo(
    () => ({
      connectionStatus: params.connectionStatus,
      provider: params.provider,
      channel: params.channel,
    }),
    [params],
  )

  const setFilters = useCallback(
    (newFilters: Partial<InboxFilterState>) => {
      setParams({
        connectionStatus: newFilters.connectionStatus ?? params.connectionStatus,
        provider: newFilters.provider ?? params.provider,
        channel: newFilters.channel ?? params.channel,
      })
    },
    [params, setParams],
  )

  const clearFilters = useCallback(() => setParams(null), [setParams])

  const hasActiveFilters =
    params.connectionStatus !== 'all' ||
    params.provider !== 'all' ||
    params.channel !== 'all'

  const activeFilterCount = [
    params.connectionStatus !== 'all',
    params.provider !== 'all',
    params.channel !== 'all',
  ].filter(Boolean).length

  return { filters, setFilters, clearFilters, hasActiveFilters, activeFilterCount }
}
