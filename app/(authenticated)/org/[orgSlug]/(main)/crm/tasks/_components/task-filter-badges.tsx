'use client'

import { X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import type { TaskFilters } from '../_lib/task-filters'
import { TASK_TYPE_OPTIONS, TASK_STATUS_OPTIONS } from '../_lib/task-filters'
import type { TaskType } from '@prisma/client'

interface TaskFilterBadgesProps {
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function TaskFilterBadges({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: TaskFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const getTypeLabel = (value: TaskType) =>
    TASK_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value

  const getStatusLabel = (value: TaskFilters['status']) =>
    TASK_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badges de tipo */}
      {filters.types.map((type) => (
        <Badge
          key={type}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Tipo: {getTypeLabel(type)}
          <button
            onClick={() =>
              onFiltersChange({
                types: filters.types.filter((t) => t !== type),
              })
            }
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {/* Badge de status */}
      {filters.status !== 'all' && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Status: {getStatusLabel(filters.status)}
          <button
            onClick={() => onFiltersChange({ status: 'all' })}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Badge de período */}
      {(filters.dateFrom || filters.dateTo) && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Período:{' '}
          {filters.dateFrom
            ? format(filters.dateFrom, 'dd/MM/yy', { locale: ptBR })
            : '...'}
          {' - '}
          {filters.dateTo
            ? format(filters.dateTo, 'dd/MM/yy', { locale: ptBR })
            : '...'}
          <button
            onClick={() => onFiltersChange({ dateFrom: null, dateTo: null })}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      {/* Botão limpar todos */}
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
