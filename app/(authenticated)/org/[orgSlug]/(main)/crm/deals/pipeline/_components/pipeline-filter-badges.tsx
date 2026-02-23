'use client'

import { X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import { formatCurrency } from '@/_utils/format-currency'
import {
  PipelineFilters,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../_lib/pipeline-filters'

interface PipelineFilterBadgesProps {
  filters: PipelineFilters
  onFiltersChange: (filters: Partial<PipelineFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function PipelineFilterBadges({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: PipelineFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const getStatusLabel = (value: string) =>
    STATUS_OPTIONS.find((o) => o.value === value)?.label || value

  const getPriorityLabel = (value: string) =>
    PRIORITY_OPTIONS.find((o) => o.value === value)?.label || value

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status badges */}
      {filters.status.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Status: {getStatusLabel(status)}
          <button
            onClick={() =>
              onFiltersChange({
                status: filters.status.filter((s) => s !== status),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Priority badges */}
      {filters.priority.map((priority) => (
        <Badge
          key={priority}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Prioridade: {getPriorityLabel(priority)}
          <button
            onClick={() =>
              onFiltersChange({
                priority: filters.priority.filter((p) => p !== priority),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Date range badge */}
      {(filters.expectedCloseDateFrom || filters.expectedCloseDateTo) && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Data:{' '}
          {filters.expectedCloseDateFrom
            ? format(filters.expectedCloseDateFrom, 'dd/MM/yy', { locale: ptBR })
            : '...'}
          {' - '}
          {filters.expectedCloseDateTo
            ? format(filters.expectedCloseDateTo, 'dd/MM/yy', { locale: ptBR })
            : '...'}
          <button
            onClick={() =>
              onFiltersChange({
                expectedCloseDateFrom: null,
                expectedCloseDateTo: null,
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Value range badge */}
      {(filters.valueMin !== null || filters.valueMax !== null) && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Valor:{' '}
          {filters.valueMin !== null ? formatCurrency(filters.valueMin) : '...'}
          {' - '}
          {filters.valueMax !== null ? formatCurrency(filters.valueMax) : '...'}
          <button
            onClick={() =>
              onFiltersChange({
                valueMin: null,
                valueMax: null,
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Clear all button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearFilters}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Limpar todos
      </Button>
    </div>
  )
}
