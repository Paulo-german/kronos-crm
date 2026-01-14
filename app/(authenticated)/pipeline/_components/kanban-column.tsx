'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trophy, XCircle } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { KanbanCard } from './kanban-card'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanColumnProps {
  stage: StageDto
  deals: DealDto[]
  isWonStage?: boolean
  isLostStage?: boolean
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
}

export function KanbanColumn({
  stage,
  deals,
  isWonStage,
  isLostStage,
  onAddDeal,
  onDealClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage },
  })

  return (
    <div
      className={`flex h-full w-96 shrink-0 flex-col rounded-lg border ${
        isOver ? 'border-primary bg-muted/50' : 'bg-muted/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          {/* Indicador de cor */}
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color || '#6b7280' }}
          />
          <span className="font-medium">{stage.name}</span>

          {/* Ícone especial */}
          {isWonStage && <Trophy className="h-4 w-4 text-green-500" />}
          {isLostStage && <XCircle className="h-4 w-4 text-red-500" />}

          {/* Contador */}
          <span className="text-xs text-muted-foreground">
            ({deals.length})
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
      <div ref={setNodeRef} className="flex-1 space-y-2 overflow-y-auto p-2">
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
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
