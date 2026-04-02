'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import { parseAsString, useQueryState } from 'nuqs'

interface DashboardPipelineFilterProps {
  pipelines: OrgPipelineDto[]
}

export function DashboardPipelineFilter({ pipelines }: DashboardPipelineFilterProps) {
  const [pipelineId, setPipelineId] = useQueryState(
    'pipelineId',
    parseAsString.withOptions({ history: 'push', shallow: false }),
  )

  // Com apenas 1 pipeline não faz sentido exibir o filtro
  if (pipelines.length <= 1) return null

  function handleChange(value: string) {
    if (value === 'all') {
      void setPipelineId(null)
    } else {
      void setPipelineId(value)
    }
  }

  return (
    <Select value={pipelineId ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Todos os funis" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os funis</SelectItem>
        <SelectSeparator />
        {pipelines.map((pipeline) => (
          <SelectItem key={pipeline.id} value={pipeline.id}>
            {pipeline.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
