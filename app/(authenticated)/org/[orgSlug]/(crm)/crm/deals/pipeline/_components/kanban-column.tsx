'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import {
  CircleDollarSignIcon,
  HandshakeIcon,
  Inbox,
  Loader2,
  Plus,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { formatCurrency } from '@/_utils/format-currency'
import KanbanCard from './kanban-card'
import { usePipelineColumn } from '../_hooks/use-pipeline-column'
import type { PipelineQueryInput } from '../_lib/pipeline-deals-query'
import type { StageDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanColumnProps {
  stage: StageDto
  queryInput: PipelineQueryInput
  /** Contagem total real do estágio (agregado, não o que está carregado). */
  count: number
  /** Soma total real do valor do estágio (agregado). */
  totalValue: number
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
  onPriorityClick: (dealId: string, anchorEl: HTMLElement) => void
  priorityOverrides: Record<string, string>
  showIdleDays: boolean
}

export function KanbanColumn({
  stage,
  queryInput,
  count,
  totalValue,
  onAddDeal,
  onDealClick,
  onPriorityClick,
  priorityOverrides,
  showIdleDays,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { type: 'column', stage },
  })

  const { deals, isLoading, isLoadingMore, hasMore, sentinelRef } =
    usePipelineColumn(stage.id, queryInput)

  return (
    <div
      className={`flex h-full w-96 shrink-0 flex-col overflow-hidden rounded-xl border transition-all duration-200 ${
        isOver
          ? 'border-primary/50 bg-primary/[0.03] shadow-lg shadow-primary/10 ring-1 ring-primary/20'
          : 'border-border bg-kanban-column'
      }`}
    >
      {/* Header */}
      <div className="bg-kanban-c space-y-1 border-border-strong p-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{stage.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onAddDeal(stage.id)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <HandshakeIcon className="size-3" />
            {count} {count === 1 ? 'negociação' : 'negociações'}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <CircleDollarSignIcon className="size-3" />
            {formatCurrency(totalValue)}
          </span>
        </p>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 space-y-3 overflow-y-auto bg-kanban-column p-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-kronos-purple [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-0.5"
      >
        <SortableContext
          items={deals.map((deal) => deal.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <KanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
              onPriorityClick={onPriorityClick}
              priorityOverride={priorityOverrides[deal.id]}
              showIdleDays={showIdleDays}
            />
          ))}
        </SortableContext>

        {/* Carga inicial */}
        {isLoading && (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
          </div>
        )}

        {/* Sentinela: dispara o próximo lote ao entrar em viewport */}
        {hasMore && (
          <div
            ref={sentinelRef}
            className="flex items-center justify-center py-3"
          >
            {isLoadingMore && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/50" />
            )}
          </div>
        )}

        {!isLoading && deals.length === 0 && (
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
