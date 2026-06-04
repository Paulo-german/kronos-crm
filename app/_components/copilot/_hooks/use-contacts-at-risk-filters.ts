'use client'

import { useQueryStates, parseAsStringLiteral, parseAsString, parseAsInteger } from 'nuqs'
import { useCallback } from 'react'
import type { LifecycleStage } from '@prisma/client'

const SORT_OPTIONS = ['scoreAsc', 'ltvDesc', 'recencyAsc'] as const
export type ContactsAtRiskSortOption = (typeof SORT_OPTIONS)[number]

const parsers = {
  sort: parseAsStringLiteral(SORT_OPTIONS).withDefault('scoreAsc'),
  stage: parseAsString,
  page: parseAsInteger.withDefault(1),
}

export function useContactsAtRiskFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    history: 'replace',
    shallow: false,
  })

  const setSort = useCallback(
    (value: ContactsAtRiskSortOption) => {
      setParams((prev) => ({ ...prev, sort: value, page: 1 }))
    },
    [setParams],
  )

  const setStage = useCallback(
    (value: LifecycleStage | null) => {
      setParams((prev) => ({ ...prev, stage: value, page: 1 }))
    },
    [setParams],
  )

  const setPage = useCallback(
    (value: number) => {
      setParams((prev) => ({ ...prev, page: value }))
    },
    [setParams],
  )

  return {
    sort: params.sort,
    setSort,
    stage: params.stage as LifecycleStage | null,
    setStage,
    page: params.page,
    setPage,
  }
}
