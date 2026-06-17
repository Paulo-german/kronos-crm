'use client'

import { useCallback, useMemo, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'
import type { PipelineStageDealsResult } from '@/_data-access/deal/get-deals-by-pipeline-stage'
import {
  buildPipelineDealsUrl,
  pipelineDealsKey,
  type PipelineQueryInput,
} from '../_lib/pipeline-deals-query'

export interface UsePipelineColumnReturn {
  deals: DealDto[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  sentinelRef: (node: HTMLElement | null) => void
}

/**
 * Infinite scroll por coluna (estágio) do Kanban. Espelha o padrão do Inbox
 * (useInfiniteQuery + IntersectionObserver), mas sem polling.
 */
export function usePipelineColumn(
  stageId: string,
  input: PipelineQueryInput,
): UsePipelineColumnReturn {
  const query = useInfiniteQuery({
    queryKey: pipelineDealsKey(stageId, input),
    queryFn: async ({ pageParam, signal }) => {
      const url = buildPipelineDealsUrl(stageId, input, pageParam)
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error('Failed to fetch deals')
      return (await response.json()) as PipelineStageDealsResult
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })

  // Flatten preservando a ordem do servidor; dedupe por id (mantém a 1ª ocorrência)
  const deals = useMemo(() => {
    if (!query.data) return []
    const seen = new Set<string>()
    const flat: DealDto[] = []
    for (const page of query.data.pages) {
      for (const deal of page.deals) {
        if (seen.has(deal.id)) continue
        seen.add(deal.id)
        flat.push(deal)
      }
    }
    return flat
  }, [query.data])

  const observerRef = useRef<IntersectionObserver | null>(null)
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node) return
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (
            entries[0]?.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage
          ) {
            void fetchNextPage()
          }
        },
        { threshold: 0.1 },
      )
      observerRef.current.observe(node)
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  return {
    deals,
    isLoading: query.isLoading,
    isLoadingMore: isFetchingNextPage,
    hasMore: hasNextPage,
    sentinelRef,
  }
}
