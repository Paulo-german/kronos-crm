'use client'

import { useState } from 'react'
import { Filter, CalendarIcon, X } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DealStatus, DealPriority } from '@prisma/client'
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
import { Calendar } from '@/_components/ui/calendar'
import { CurrencyInput } from '@/_components/form-controls/currency-input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import {
  PipelineFilters,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../_lib/pipeline-filters'

interface PipelineFiltersSheetProps {
  filters: PipelineFilters
  onFiltersChange: (filters: Partial<PipelineFilters>) => void
  activeFilterCount: number
}

export function PipelineFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: PipelineFiltersSheetProps) {
  // Estado local para edição antes de aplicar
  const [localFilters, setLocalFilters] = useState<PipelineFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  // Sincroniza estado local quando o sheet abre
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsOpen(open)
  }

  const handleStatusToggle = (status: DealStatus) => {
    const newStatus = localFilters.status.includes(status)
      ? localFilters.status.filter((s) => s !== status)
      : [...localFilters.status, status]
    setLocalFilters({ ...localFilters, status: newStatus })
  }

  const handlePriorityToggle = (priority: DealPriority) => {
    const newPriority = localFilters.priority.includes(priority)
      ? localFilters.priority.filter((p) => p !== priority)
      : [...localFilters.priority, priority]
    setLocalFilters({ ...localFilters, priority: newPriority })
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearLocal = () => {
    setLocalFilters({
      status: [],
      priority: [],
      expectedCloseDateFrom: null,
      expectedCloseDateTo: null,
      valueMin: null,
      valueMax: null,
    })
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 h-5 min-w-5 px-1.5 text-xs"
            >
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
          {/* Status Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.status.includes(option.value)
                      ? option.color
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.status.includes(option.value)}
                    onCheckedChange={() => handleStatusToggle(option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Prioridade</Label>
            <div className="flex flex-wrap gap-2">
              {PRIORITY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                    localFilters.priority.includes(option.value)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  <Checkbox
                    checked={localFilters.priority.includes(option.value)}
                    onCheckedChange={() => handlePriorityToggle(option.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              Data Prevista de Fechamento
            </Label>
            <div className="grid gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !localFilters.expectedCloseDateFrom &&
                        'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.expectedCloseDateFrom ? (
                      format(localFilters.expectedCloseDateFrom, 'PPP', {
                        locale: ptBR,
                      })
                    ) : (
                      <span>Data inicial</span>
                    )}
                    {localFilters.expectedCloseDateFrom && (
                      <X
                        className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLocalFilters({
                            ...localFilters,
                            expectedCloseDateFrom: null,
                          })
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.expectedCloseDateFrom || undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        expectedCloseDateFrom: date || null,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !localFilters.expectedCloseDateTo &&
                        'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.expectedCloseDateTo ? (
                      format(localFilters.expectedCloseDateTo, 'PPP', {
                        locale: ptBR,
                      })
                    ) : (
                      <span>Data final</span>
                    )}
                    {localFilters.expectedCloseDateTo && (
                      <X
                        className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          setLocalFilters({
                            ...localFilters,
                            expectedCloseDateTo: null,
                          })
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.expectedCloseDateTo || undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        expectedCloseDateTo: date || null,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Value Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Valor do Deal</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mínimo</Label>
                <CurrencyInput
                  placeholder="R$ 0,00"
                  value={localFilters.valueMin ?? ''}
                  onValueChange={(values) =>
                    setLocalFilters({
                      ...localFilters,
                      valueMin: values.floatValue ?? null,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Máximo</Label>
                <CurrencyInput
                  placeholder="R$ 0,00"
                  value={localFilters.valueMax ?? ''}
                  onValueChange={(values) =>
                    setLocalFilters({
                      ...localFilters,
                      valueMax: values.floatValue ?? null,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t pt-4">
          <Button
            variant="outline"
            onClick={handleClearLocal}
            className="flex-1"
          >
            Limpar
          </Button>
          <SheetClose asChild>
            <Button onClick={handleApplyFilters} className="flex-1">
              Aplicar Filtros
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
