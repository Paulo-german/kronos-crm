'use client'

import { useState } from 'react'
import { Filter, InfoIcon } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { cn } from '@/_lib/utils'
import {
  DealFilters,
  DEFAULT_DEAL_FILTERS,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from '../_lib/deal-filters'
import { priorityConfig } from '../pipeline/_components/kanban-card'

interface DealFiltersSheetProps {
  filters: DealFilters
  onFiltersChange: (filters: Partial<DealFilters>) => void
  activeFilterCount: number
}

/** Label de seção com ícone de ajuda e tooltip — padrão dos filtros de contatos */
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

/**
 * Sheet de filtros avançados compartilhado pelas visões pipeline (kanban) e
 * list (paginada). Estado local editável até o usuário aplicar.
 */
export function DealFiltersSheet({
  filters,
  onFiltersChange,
  activeFilterCount,
}: DealFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<DealFilters>(filters)
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
      ? localFilters.status.filter((item) => item !== status)
      : [...localFilters.status, status]
    setLocalFilters({ ...localFilters, status: newStatus })
  }

  const handlePriorityToggle = (priority: DealPriority) => {
    const newPriority = localFilters.priority.includes(priority)
      ? localFilters.priority.filter((item) => item !== priority)
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
            {/* Status Filter */}
            <div className="space-y-3">
              <FilterSectionLabel
                label="Status"
                tooltip="Filtra negociações pela situação atual no funil — ex: novo, em andamento, vendido. Selecione múltiplos para combinar."
              />
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                      localFilters.status.includes(option.value)
                        ? option.color
                        : 'border-border-strong hover:bg-accent',
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
              <FilterSectionLabel
                label="Prioridade"
                tooltip="Filtra pelo nível de prioridade da negociação. Útil para focar primeiro nos negócios mais urgentes do pipeline."
              />
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((option) => {
                  const config = priorityConfig[option.value]
                  const isActive = localFilters.priority.includes(option.value)
                  const PriorityIcon = config.icon
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 transition-colors',
                        isActive
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-border-strong hover:bg-accent',
                      )}
                    >
                      <Checkbox
                        checked={isActive}
                        onCheckedChange={() =>
                          handlePriorityToggle(option.value)
                        }
                        className="sr-only"
                      />
                      <PriorityIcon
                        className={cn(
                          'size-3.5',
                          isActive ? 'text-primary' : config.color,
                        )}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-3">
              <FilterSectionLabel
                label="Data de Criação"
                tooltip="Restringe às negociações criadas dentro do período selecionado. Deixe em branco para incluir todas as datas."
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

            {/* Value Range Filter */}
            <div className="space-y-3">
              <FilterSectionLabel
                label="Valor da Negociação"
                tooltip="Filtra pelo valor monetário do negócio. Defina um mínimo e/ou máximo para encontrar faixas específicas de ticket."
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Mínimo
                  </Label>
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
                  <Label className="text-xs text-muted-foreground">
                    Máximo
                  </Label>
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
