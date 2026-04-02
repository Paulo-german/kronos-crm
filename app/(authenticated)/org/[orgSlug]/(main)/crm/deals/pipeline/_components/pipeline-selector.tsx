'use client'

import { useRouter, useParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { FunnelIcon, Plus } from 'lucide-react'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import { useQueryState, parseAsString } from 'nuqs'

// Valor reservado para a ação de criar novo funil
const CREATE_NEW_VALUE = '__create_new__'

interface PipelineSelectorProps {
  pipelines: OrgPipelineDto[]
  activePipelineId: string
}

export function PipelineSelector({
  pipelines,
  activePipelineId,
}: PipelineSelectorProps) {
  const router = useRouter()
  const params = useParams<{ orgSlug: string }>()
  const [, setPipelineId] = useQueryState(
    'pipelineId',
    parseAsString.withOptions({ history: 'push', shallow: false }),
  )

  const handleChange = (value: string) => {
    // Redireciona para a página de settings de pipelines
    if (value === CREATE_NEW_VALUE) {
      router.push(`/org/${params.orgSlug}/settings/pipelines`)
      return
    }

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
          <SelectSeparator />
          <SelectItem
            value={CREATE_NEW_VALUE}
            className="text-muted-foreground"
          >
            <span className="flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              Gerenciar funis
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
