'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { FunnelIcon } from 'lucide-react'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import { useQueryState, parseAsString } from 'nuqs'

interface PipelineSelectorProps {
  pipelines: OrgPipelineDto[]
  activePipelineId: string
}

export function PipelineSelector({
  pipelines,
  activePipelineId,
}: PipelineSelectorProps) {
  const [, setPipelineId] = useQueryState(
    'pipelineId',
    parseAsString.withOptions({ history: 'push', shallow: false }),
  )

  // Se só tem 1 pipeline, não exibe o seletor
  if (pipelines.length <= 1) return null

  const handleChange = (value: string) => {
    const selectedPipeline = pipelines.find((pipeline) => pipeline.id === value)

    // Pipeline default: remove o param da URL (server carrega o default)
    if (selectedPipeline?.isDefault) {
      setPipelineId(null)
    } else {
      setPipelineId(value)
    }
  }

  return (
    <div className="ml-1">
      <Select value={activePipelineId} onValueChange={handleChange}>
        <SelectTrigger className="w-[300px]">
          <FunnelIcon className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Selecione o funil" />
        </SelectTrigger>
        <SelectContent>
          {pipelines.map((pipeline) => (
            <SelectItem key={pipeline.id} value={pipeline.id}>
              {pipeline.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
