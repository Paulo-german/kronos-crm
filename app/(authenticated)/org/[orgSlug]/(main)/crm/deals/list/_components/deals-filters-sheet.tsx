'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
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
import { DateRangePicker } from '@/_components/ui/date-range-picker'
import { CurrencyInput } from '@/_components/form-controls/currency-input'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import {
  DealFilters,
  DEFAULT_DEAL_FILTERS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../../_lib/deal-filters'

interface DealsFiltersSheetProps {
  filters: DealFilters
  onFiltersChange: (filters: Partial<DealFilters>) => void
  activeFilterCount: number
}

export function DealsFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: DealsFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<DealFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

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
    setLocalFilters(DEFAULT_DEAL_FILTERS)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 bg-background hover:bg-background/80">
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
            <Label className="text-sm font-semibold">Data de Criação</Label>
            <DateRangePicker
              value={
                localFilters.createdAtFrom
                  ? {
                      from: localFilters.createdAtFrom,
                      to: localFilters.createdAtTo ?? undefined,
                    }
                  : undefined
              }
              onChange={(range) =>
                setLocalFilters({
                  ...localFilters,
                  createdAtFrom: range?.from ?? null,
                  createdAtTo: range?.to ?? null,
                })
              }
            />
          </div>

          {/* Value Range Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Valor da Negociação</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Mínimo</label>
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
                <label className="text-xs text-muted-foreground">Máximo</label>
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
