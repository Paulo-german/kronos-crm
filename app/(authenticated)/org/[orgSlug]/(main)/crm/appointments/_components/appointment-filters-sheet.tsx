'use client'

import { useState } from 'react'
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
import { Calendar } from '@/_components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import type { AppointmentFilters } from '../_lib/appointment-filters'
import {
  APPOINTMENT_STATUS_OPTIONS,
  DEFAULT_APPOINTMENT_FILTERS,
} from '../_lib/appointment-filters'
import type { AppointmentStatus } from '@prisma/client'

interface AppointmentFiltersSheetProps {
  filters: AppointmentFilters
  onFiltersChange: (filters: Partial<AppointmentFilters>) => void
  activeFilterCount: number
}

export function AppointmentFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: AppointmentFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<AppointmentFilters>(filters)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setLocalFilters(filters)
    }
    setIsOpen(open)
  }

  const handleStatusToggle = (status: AppointmentStatus) => {
    const newStatus = localFilters.status.includes(status)
      ? localFilters.status.filter((s) => s !== status)
      : [...localFilters.status, status]
    setLocalFilters({ ...localFilters, status: newStatus })
  }

  const handleApplyFilters = () => {
    onFiltersChange(localFilters)
    setIsOpen(false)
  }

  const handleClearLocal = () => {
    setLocalFilters(DEFAULT_APPOINTMENT_FILTERS)
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="soft"
          className="gap-2"
        >
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
          {/* Filtro de Status */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Status</Label>
            <div className="flex flex-wrap gap-2">
              {APPOINTMENT_STATUS_OPTIONS.map((option) => (
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
