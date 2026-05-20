'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
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
import { Label } from '@/_components/ui/label'
import { DateRangePicker } from '@/_components/ui/date-range-picker'
import { Badge } from '@/_components/ui/badge'
import type { TaskFilters } from '../_lib/task-filters'
import { DEFAULT_TASK_FILTERS } from '../_lib/task-filters'

interface TaskFiltersSheetProps {
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  activeFilterCount: number
}

export function TaskFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: TaskFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<TaskFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsOpen(open)
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearLocal = () => {
    setLocalFilters(DEFAULT_TASK_FILTERS)
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
          {/* Filtro de Data de Vencimento */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Data de vencimento</Label>
            <DateRangePicker
              value={
                localFilters.dateFrom
                  ? { from: localFilters.dateFrom, to: localFilters.dateTo ?? undefined }
                  : undefined
              }
              onChange={(range) =>
                setLocalFilters({
                  ...localFilters,
                  dateFrom: range?.from ?? null,
                  dateTo: range?.to ?? null,
                })
              }
            />
          </div>

          {/* Filtro de Data de Criação */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Data de criação</Label>
            <DateRangePicker
              value={
                localFilters.createdAtFrom
                  ? { from: localFilters.createdAtFrom, to: localFilters.createdAtTo ?? undefined }
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
