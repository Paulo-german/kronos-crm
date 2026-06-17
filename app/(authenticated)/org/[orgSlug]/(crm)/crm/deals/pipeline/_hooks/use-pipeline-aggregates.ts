'use client'

import { useQuery } from '@tanstack/react-query'
import type { PipelineStageAggregates } from '@/_data-access/deal/get-pipeline-stage-aggregates'
import {
  buildPipelineAggregatesUrl,
  pipelineAggregatesKey,
  type PipelineQueryInput,
} from '../_lib/pipeline-deals-query'

interface AggregatesResponse {
  aggregates: PipelineStageAggregates
}

/**
 * Contagem + soma de valor por estágio (respeitando filtros). Alimenta os headers
 * das colunas e a barra de progresso, sempre refletindo o total real do banco.
 */
export function usePipelineAggregates(
  pipelineId: string,
  stageIds: string[],
  input: PipelineQueryInput,
): PipelineStageAggregates {
  const query = useQuery({
    queryKey: pipelineAggregatesKey(pipelineId, input),
    queryFn: async ({ signal }) => {
      const url = buildPipelineAggregatesUrl(pipelineId, stageIds, input)
      const response = await fetch(url, { signal })
      if (!response.ok) throw new Error('Failed to fetch aggregates')
      const data = (await response.json()) as AggregatesResponse
      return data.aggregates
    },
  })

  return query.data ?? {}
}
