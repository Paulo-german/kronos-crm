'use client'

import { useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Filter, CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/_components/ui/sheet'
import { Button } from '@/_components/ui/button'
import { Checkbox } from '@/_components/ui/checkbox'
import { Label } from '@/_components/ui/label'
import { Badge } from '@/_components/ui/badge'
import { Input } from '@/_components/ui/input'
import { Calendar } from '@/_components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { cn } from '@/_lib/utils'
import type { AgentExecutionStatus } from '@prisma/client'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: {
  value: AgentExecutionStatus
  label: string
  color: string
}[] = [
  {
    value: 'COMPLETED',
    label: 'Concluído',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  {
    value: 'FAILED',
    label: 'Falhou',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  {
    value: 'SKIPPED',
    label: 'Ignorado',
    color: 'bg-muted text-muted-foreground border-border',
  },
]

interface LocalFilters {
  status: AgentExecutionStatus[]
  dateFrom: Date | null
  dateTo: Date | null
  timeFrom: string // HH:mm
  timeTo: string   // HH:mm
}

const DEFAULT_LOCAL: LocalFilters = {
  status: [],
  dateFrom: null,
  dateTo: null,
  timeFrom: '00:00',
  timeTo: '23:59',
}

/**
 * Cria Date local a partir de yyyy-MM-dd evitando problema de timezone.
 * `new Date('2026-03-26')` interpreta como UTC → perde 1 dia no fuso BR.
 * Aqui parseamos manualmente para garantir data local correta.
 */
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Formata Date para yyyy-MM-dd sem conversão de timezone.
 */
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}


// ---------------------------------------------------------------------------
// Sheet de Filtros (padrão pipeline)
// ---------------------------------------------------------------------------

interface ExecutionFiltersSheetProps {
  activeFilterCount: number
  currentFilters: LocalFilters
  onApply: (filters: LocalFilters) => void
}

export function ExecutionFiltersSheet({
  activeFilterCount,
  currentFilters,
  onApply,
}: ExecutionFiltersSheetProps) {
  const [local, setLocal] = useState<LocalFilters>(currentFilters)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) setLocal(currentFilters)
    setIsOpen(open)
  }

  const handleStatusToggle = (status: AgentExecutionStatus) => {
    const newStatus = local.status.includes(status)
      ? local.status.filter((item) => item !== status)
      : [...local.status, status]
    setLocal({ ...local, status: newStatus })
  }

  const handleApply = () => {
    onApply(local)
    setIsOpen(false)
  }

  const handleClear = () => {
    setLocal(DEFAULT_LOCAL)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="soft" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 bg-primary/30 px-1.5 text-xs text-primary hover:bg-primary/30">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Filtros Avançados</SheetTitle>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto py-4">
          {/* Status */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    local.status.includes(option.value)
                      ? option.color
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={local.status.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Período — De */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Período</Label>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">De</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !local.dateFrom && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {local.dateFrom ? (
                        format(local.dateFrom, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Data inicial</span>
                      )}
                      {local.dateFrom && (
                        <X
                          className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation()
                            setLocal({ ...local, dateFrom: null, timeFrom: '00:00' })
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={local.dateFrom || undefined}
                      onSelect={(date) =>
                        setLocal({ ...local, dateFrom: date || null })
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-[110px]"
                  value={local.timeFrom}
                  onChange={(event) =>
                    setLocal({ ...local, timeFrom: event.target.value })
                  }
                  disabled={!local.dateFrom}
                />
              </div>
            </div>

            {/* Período — Até */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'flex-1 justify-start text-left font-normal',
                        !local.dateTo && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {local.dateTo ? (
                        format(local.dateTo, 'PPP', { locale: ptBR })
                      ) : (
                        <span>Data final</span>
                      )}
                      {local.dateTo && (
                        <X
                          className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                          onClick={(event) => {
                            event.stopPropagation()
                            setLocal({ ...local, dateTo: null, timeTo: '23:59' })
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={local.dateTo || undefined}
                      onSelect={(date) =>
                        setLocal({ ...local, dateTo: date || null })
                      }
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-[110px]"
                  value={local.timeTo}
                  onChange={(event) =>
                    setLocal({ ...local, timeTo: event.target.value })
                  }
                  disabled={!local.dateTo}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleClear} className="flex-1">
            Limpar
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApply} className="flex-1">
              Aplicar Filtros
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ---------------------------------------------------------------------------
// Badges de Filtros Ativos (padrão pipeline)
// ---------------------------------------------------------------------------

interface ExecutionFilterBadgesProps {
  filters: LocalFilters
  onRemoveStatus: (status: AgentExecutionStatus) => void
  onRemoveDates: () => void
  onClearAll: () => void
  hasActiveFilters: boolean
}

export function ExecutionFilterBadges({
  filters,
  onRemoveStatus,
  onRemoveDates,
  onClearAll,
  hasActiveFilters,
}: ExecutionFilterBadgesProps) {
  if (!hasActiveFilters) return null

  const getStatusLabel = (value: AgentExecutionStatus) =>
    STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.status.map((status) => (
        <Badge
          key={status}
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Status: {getStatusLabel(status)}
          <button
            onClick={() => onRemoveStatus(status)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {(filters.dateFrom || filters.dateTo) && (
        <Badge
          variant="secondary"
          className="gap-1 pr-1 text-xs font-normal"
        >
          Período:{' '}
          {filters.dateFrom
            ? `${format(filters.dateFrom, 'dd/MM/yy', { locale: ptBR })} ${filters.timeFrom}`
            : '...'}
          {' - '}
          {filters.dateTo
            ? `${format(filters.dateTo, 'dd/MM/yy', { locale: ptBR })} ${filters.timeTo}`
            : '...'}
          <button
            onClick={onRemoveDates}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
      >
        Limpar todos
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hook para gerenciar filtros via URL (padrão use-pipeline-filters)
// ---------------------------------------------------------------------------

export function useExecutionFilters() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const statusParam = searchParams.get('status')
  const dateFromParam = searchParams.get('startDate')
  const dateToParam = searchParams.get('endDate')
  const timeFromParam = searchParams.get('timeFrom')
  const timeToParam = searchParams.get('timeTo')

  const filters: LocalFilters = {
    status: statusParam
      ? (statusParam.split(',') as AgentExecutionStatus[])
      : [],
    dateFrom: dateFromParam ? parseLocalDate(dateFromParam) : null,
    dateTo: dateToParam ? parseLocalDate(dateToParam) : null,
    timeFrom: timeFromParam ?? '00:00',
    timeTo: timeToParam ?? '23:59',
  }

  const applyFilters = (newFilters: LocalFilters) => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('page')

    if (newFilters.status.length > 0) {
      params.set('status', newFilters.status.join(','))
    } else {
      params.delete('status')
    }

    if (newFilters.dateFrom) {
      params.set('startDate', formatLocalDate(newFilters.dateFrom))
      params.set('timeFrom', newFilters.timeFrom)
    } else {
      params.delete('startDate')
      params.delete('timeFrom')
    }

    if (newFilters.dateTo) {
      params.set('endDate', formatLocalDate(newFilters.dateTo))
      params.set('timeTo', newFilters.timeTo)
    } else {
      params.delete('endDate')
      params.delete('timeTo')
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const removeStatus = (status: AgentExecutionStatus) => {
    applyFilters({
      ...filters,
      status: filters.status.filter((item) => item !== status),
    })
  }

  const removeDates = () => {
    applyFilters({
      ...filters,
      dateFrom: null,
      dateTo: null,
      timeFrom: '00:00',
      timeTo: '23:59',
    })
  }

  const clearAll = () => {
    const params = new URLSearchParams(searchParams.toString())
    ;['status', 'startDate', 'endDate', 'timeFrom', 'timeTo', 'page'].forEach(
      (key) => params.delete(key),
    )
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  let activeFilterCount = 0
  if (filters.status.length > 0) activeFilterCount++
  if (filters.dateFrom || filters.dateTo) activeFilterCount++

  return {
    filters,
    applyFilters,
    removeStatus,
    removeDates,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  }
}
