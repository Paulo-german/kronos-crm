'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { GitBranch, Clock } from 'lucide-react'
import { cn } from '@/_lib/utils'

interface PipelineOption {
  id: string
  name: string
}

interface PipelineFiltersProps {
  pipelines: PipelineOption[]
}

const pipelineFiltersParsers = {
  pipelineId: parseAsString.withOptions({ shallow: false }),
  inactiveDays: parseAsString.withOptions({ shallow: false }),
}

const INACTIVE_DAYS_OPTIONS = [
  { value: '7', label: 'Parado há 7 dias' },
  { value: '14', label: 'Parado há 14 dias' },
  { value: '30', label: 'Parado há 30 dias' },
  { value: '60', label: 'Parado há 60 dias' },
] as const

export function PipelineFilters({ pipelines }: PipelineFiltersProps) {
  const [filters, setFilters] = useQueryStates(pipelineFiltersParsers)

  return (
    <div className="flex items-center gap-2">
      {/* Filtro: Pipeline */}
      {pipelines.length > 1 && (
        <Select
          value={filters.pipelineId ?? 'all'}
          onValueChange={(value) =>
            void setFilters({ pipelineId: value === 'all' ? null : value })
          }
        >
          <SelectTrigger
            className={cn(
              'h-8 w-auto min-w-[140px] gap-1.5 border px-2.5 text-xs font-medium',
              filters.pipelineId && 'border-primary/40 bg-primary/5 text-primary',
            )}
          >
            <GitBranch className="size-3.5 text-muted-foreground" />
            <SelectValue placeholder="Pipeline" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pipelines</SelectItem>
            <SelectSeparator />
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Filtro: Inatividade */}
      <Select
        value={filters.inactiveDays ?? 'all'}
        onValueChange={(value) =>
          void setFilters({ inactiveDays: value === 'all' ? null : value })
        }
      >
        <SelectTrigger
          className={cn(
            'h-8 w-auto min-w-[150px] gap-1.5 border px-2.5 text-xs font-medium',
            filters.inactiveDays && 'border-primary/40 bg-primary/5 text-primary',
          )}
        >
          <Clock className="size-3.5 text-muted-foreground" />
          <SelectValue placeholder="Inatividade" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer inatividade</SelectItem>
          <SelectSeparator />
          {INACTIVE_DAYS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
