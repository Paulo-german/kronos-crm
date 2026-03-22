'use client'

import { X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/_components/ui/badge'
import { Button } from '@/_components/ui/button'
import type { AppointmentFilters } from '../_lib/appointment-filters'
import { APPOINTMENT_STATUS_OPTIONS } from '../_lib/appointment-filters'

interface AppointmentFilterBadgesProps {
  filters: AppointmentFilters
  onFiltersChange: (filters: Partial<AppointmentFilters>) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function AppointmentFilterBadges({
  filters,
  onFiltersChange,
  onClearFilters,
  hasActiveFilters,
}: AppointmentFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const getStatusLabel = (value: string) =>
    APPOINTMENT_STATUS_OPTIONS.find((option) => option.value === value)
      ?.label || value

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badges de status */}
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
            onClick={() =>
              onFiltersChange({ dateFrom: null, dateTo: null })
            }
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
