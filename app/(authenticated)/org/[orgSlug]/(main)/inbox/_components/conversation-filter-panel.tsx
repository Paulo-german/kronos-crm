'use client'

import { Filter } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Checkbox } from '@/_components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Separator } from '@/_components/ui/separator'
import { ScrollArea } from '@/_components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { getLabelColor } from '@/_lib/constants/label-colors'
import type { ConversationLabelDto } from '@/_data-access/conversation/get-conversations'

interface ConversationFilterPanelProps {
  statusFilter: 'OPEN' | 'RESOLVED'
  onStatusFilterChange: (status: 'OPEN' | 'RESOLVED') => void
  selectedLabelIds: string[]
  onLabelIdsChange: (ids: string[]) => void
  availableLabels: ConversationLabelDto[]
}

export function ConversationFilterPanel({
  statusFilter,
  onStatusFilterChange,
  selectedLabelIds,
  onLabelIdsChange,
  availableLabels,
}: ConversationFilterPanelProps) {
  const hasActiveFilters = statusFilter !== 'OPEN' || selectedLabelIds.length > 0

  const handleLabelToggle = (labelId: string) => {
    if (selectedLabelIds.includes(labelId)) {
      onLabelIdsChange(selectedLabelIds.filter((id) => id !== labelId))
    } else {
      onLabelIdsChange([...selectedLabelIds, labelId])
    }
  }

  const handleClearFilters = () => {
    onStatusFilterChange('OPEN')
    onLabelIdsChange([])
  }

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'relative h-7 w-7',
                  hasActiveFilters
                    ? 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                {/* Indicador de filtros ativos */}
                {hasActiveFilters && (
                  <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="sr-only">Filtros</span>
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{hasActiveFilters ? 'Filtros ativos' : 'Filtrar conversas'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="end" className="w-64 p-0" sideOffset={4}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2.5">
          <span className="text-xs font-semibold text-foreground">Filtros</span>
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {(statusFilter !== 'OPEN' ? 1 : 0) + selectedLabelIds.length} ativos
            </Badge>
          )}
        </div>

        <Separator />

        {/* Seção: Status */}
        <div className="px-3 py-2.5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Status
          </p>
          <RadioGroup
            value={statusFilter}
            onValueChange={(value) => onStatusFilterChange(value as 'OPEN' | 'RESOLVED')}
            className="space-y-1"
          >
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50">
              <RadioGroupItem value="OPEN" id="filter-status-open" className="h-3.5 w-3.5" />
              <span className="text-sm">Abertas</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-accent/50">
              <RadioGroupItem value="RESOLVED" id="filter-status-resolved" className="h-3.5 w-3.5" />
              <span className="text-sm">Resolvidas</span>
            </label>
          </RadioGroup>
        </div>

        {availableLabels.length > 0 && (
          <>
            <Separator />

            {/* Seção: Etiquetas */}
            <div className="px-3 py-2.5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Etiquetas
              </p>
              <ScrollArea className="max-h-48">
                <div className="space-y-0.5 pr-2">
                  {availableLabels.map((label) => {
                    const isSelected = selectedLabelIds.includes(label.id)
                    const colorConfig = getLabelColor(label.color)

                    return (
                      <label
                        key={label.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-accent/50',
                          isSelected && 'bg-accent/30',
                        )}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleLabelToggle(label.id)}
                          className="h-3.5 w-3.5"
                        />
                        <span
                          className={cn('h-2 w-2 shrink-0 rounded-full', colorConfig.dot)}
                        />
                        <span className="truncate text-sm">{label.name}</span>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </>
        )}

        {/* Footer: limpar filtros */}
        {hasActiveFilters && (
          <>
            <Separator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-full text-xs text-muted-foreground hover:text-destructive"
                onClick={handleClearFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
