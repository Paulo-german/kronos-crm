'use client'

import { useState } from 'react'
import { Filter, InfoIcon } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import type { TaskFilters } from '../_lib/task-filters'
import { DEFAULT_TASK_FILTERS } from '../_lib/task-filters'

interface TaskFiltersSheetProps {
  filters: TaskFilters
  onFiltersChange: (filters: Partial<TaskFilters>) => void
  activeFilterCount: number
}

/** Label de seção com ícone de ajuda e tooltip — padrão dos filtros de contatos/negociações */
const FilterSectionLabel = ({
  label,
  tooltip,
}: {
  label: string
  tooltip: string
}) => (
  <div className="flex items-center gap-1.5">
    <Label className="text-sm font-semibold">{label}</Label>
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{tooltip}</TooltipContent>
    </Tooltip>
  </div>
)

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

        <TooltipProvider>
          <div className="flex-1 space-y-6 overflow-y-auto py-4">
            {/* Filtro de Data de Vencimento */}
            <div className="space-y-3">
              <FilterSectionLabel
                label="Data de vencimento"
                tooltip="Restringe às tarefas cujo prazo de conclusão cai dentro do período selecionado. Deixe em branco para incluir todas as datas."
              />
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

            {/* Filtro de Data de Criação */}
            <div className="space-y-3">
              <FilterSectionLabel
                label="Data de criação"
                tooltip="Restringe às tarefas criadas dentro do período selecionado. Útil para auditar o que foi cadastrado em uma janela de tempo."
              />
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
          </div>
        </TooltipProvider>

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
