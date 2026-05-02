'use client'

import { useState } from 'react'
import {
  Filter,
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
} from 'lucide-react'
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
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { TaskFilters } from '../_lib/task-filters'
import {
  DEFAULT_TASK_FILTERS,
  TASK_TYPE_OPTIONS,
  TASK_STATUS_OPTIONS,
} from '../_lib/task-filters'
import type { TaskType } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'

// Mapa de ícones por nome (resolve os strings do TASK_TYPE_OPTIONS)
const ICON_MAP: Record<string, LucideIcon> = {
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
}

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

  const handleTypeToggle = (type: TaskType) => {
    const newTypes = localFilters.types.includes(type)
      ? localFilters.types.filter((t) => t !== type)
      : [...localFilters.types, type]
    setLocalFilters({ ...localFilters, types: newTypes })
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
          {/* Filtro de Tipo */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Tipo de Tarefa</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_TYPE_OPTIONS.map((option) => {
                const Icon = ICON_MAP[option.icon]
                const isActive = localFilters.types.includes(option.value)

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                      isActive ? option.color : 'border-input hover:bg-accent',
                    )}
                  >
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() => handleTypeToggle(option.value)}
                      className="sr-only"
                    />
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    <span className="text-sm">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Filtro de Status */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_STATUS_OPTIONS.map((option) => {
                const isActive = localFilters.status === option.value

                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary/10 text-primary'
                        : 'border-input hover:bg-accent',
                    )}
                  >
                    <Checkbox
                      checked={isActive}
                      onCheckedChange={() =>
                        setLocalFilters({
                          ...localFilters,
                          status: option.value,
                        })
                      }
                      className="sr-only"
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Filtro de Período */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Período</Label>
            <DateRangePicker
              value={
                localFilters.dateFrom
                  ? {
                      from: localFilters.dateFrom,
                      to: localFilters.dateTo ?? undefined,
                    }
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
