'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import KanbanCard from './kanban-card'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanColumnProps {
  stage: StageDto
  deals: DealDto[]
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
  onPriorityClick: (dealId: string, anchorEl: HTMLElement) => void
  priorityOverrides: Record<string, string>
}

export function KanbanColumn({
  stage,
  deals,
  onAddDeal,
  onDealClick,
  onPriorityClick,
  priorityOverrides,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage },
  })

  return (
    <div
      className={`flex h-full w-96 shrink-0 flex-col rounded-md border bg-secondary/20 ${
        isOver ? 'border-primary bg-muted/50' : 'bg-muted/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{stage.name}</span>

          {/* Contador */}
          <span className="rounded-sm border border-border bg-background px-2 py-1 text-xs font-bold text-kronos-purple">
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
          <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
            Nenhum deal
          </div>
        )}
      </div>
    </div>
  )
}
