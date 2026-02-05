'use client'

import { useState, useEffect } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { globalSearchAction } from '@/_actions/search/global-search'
import { useDebounce } from '@/_components/hooks/use-debounce'
import { GlobalSearchResult } from '@/_data-access/search/types'

const DEBOUNCE_DELAY = 300
const MIN_QUERY_LENGTH = 3

const emptyResult: GlobalSearchResult = {
  contacts: [],
  companies: [],
  deals: [],
  totalCount: 0,
}

export function useGlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GlobalSearchResult>(emptyResult)
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY)

  const { execute, isPending } = useAction(globalSearchAction, {
    onSuccess: ({ data }) => {
      if (data) {
        setResults(data)
      }
    },
    onError: () => {
      setResults(emptyResult)
    },
  })

  useEffect(() => {
    if (debouncedQuery.length >= MIN_QUERY_LENGTH) {
      execute({ query: debouncedQuery })
    } else {
      setResults(emptyResult)
    }
  }, [debouncedQuery, execute])

  const reset = () => {
    setQuery('')
    setResults(emptyResult)
  }

  const isMinChars = query.length > 0 && query.length < MIN_QUERY_LENGTH

  return {
    query,
    setQuery,
    results,
    isLoading: isPending,
    isMinChars,
    reset,
  }
}
