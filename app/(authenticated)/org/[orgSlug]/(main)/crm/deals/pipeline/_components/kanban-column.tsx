'use client'

import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Inbox, Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { formatCurrency } from '@/_utils/format-currency'
import KanbanCard from './kanban-card'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanColumnProps {
  stage: StageDto
  deals: DealDto[]
  totalPipelineValue: number
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
  onPriorityClick: (dealId: string, anchorEl: HTMLElement) => void
  priorityOverrides: Record<string, string>
}

export function KanbanColumn({
  stage,
  deals,
  totalPipelineValue,
  onAddDeal,
  onDealClick,
  onPriorityClick,
  priorityOverrides,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage },
  })

  const totalValue = useMemo(
    () => deals.reduce((sum, deal) => sum + deal.totalValue, 0),
    [deals],
  )

  const valuePercentage =
    totalPipelineValue > 0
      ? Math.round((totalValue / totalPipelineValue) * 100)
      : 0

  return (
    <div
      className={`flex h-full w-96 shrink-0 flex-col overflow-hidden rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-primary/50 bg-primary/[0.03] shadow-lg shadow-primary/10 ring-1 ring-primary/20'
          : 'bg-muted/30'
      }`}
    >
      {/* Header */}
      <div className="space-y-2.5 border-b p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 shrink-0 rounded-full bg-primary" />
            <span className="text-sm font-semibold">{stage.name}</span>
            <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
              {deals.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddDeal(stage.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {formatCurrency(totalValue)}
          </span>
          {totalPipelineValue > 0 && (
            <span className="text-[10px] text-muted-foreground/70">
              {valuePercentage}%
            </span>
          )}
        </div>

        {totalPipelineValue > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${Math.max(valuePercentage, totalValue > 0 ? 3 : 0)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-kronos-purple [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-0.5"
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
              onPriorityClick={onPriorityClick}
              priorityOverride={priorityOverrides[deal.id]}
            />
          ))}
        </SortableContext>

        {deals.length === 0 && (
          <div
            className={`flex h-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-all duration-200 ${
              isOver
                ? 'scale-[1.02] border-primary/50 bg-primary/5'
                : 'border-muted-foreground/20'
            }`}
          >
            <Inbox className="h-5 w-5 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/50">
              Arraste negociações aqui
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
