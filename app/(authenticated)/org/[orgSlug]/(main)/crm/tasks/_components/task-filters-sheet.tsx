'use client'

import { useState } from 'react'
import {
  Filter,
  CalendarIcon,
  X,
  CheckCircle2,
  Users,
  Phone,
  MessageCircle,
  Briefcase,
  Mail,
} from 'lucide-react'
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
import { Calendar } from '@/_components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
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
            <div className="grid gap-2">
              {/* Data inicial */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !localFilters.dateFrom && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateFrom ? (
                      format(localFilters.dateFrom, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Data inicial</span>
                    )}
                    {localFilters.dateFrom && (
                      <X
                        className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          setLocalFilters({ ...localFilters, dateFrom: null })
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateFrom || undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        dateFrom: date || null,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>

              {/* Data final */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !localFilters.dateTo && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.dateTo ? (
                      format(localFilters.dateTo, 'PPP', { locale: ptBR })
                    ) : (
                      <span>Data final</span>
                    )}
                    {localFilters.dateTo && (
                      <X
                        className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation()
                          setLocalFilters({ ...localFilters, dateTo: null })
                        }}
                      />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={localFilters.dateTo || undefined}
                    onSelect={(date) =>
                      setLocalFilters({
                        ...localFilters,
                        dateTo: date || null,
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
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
