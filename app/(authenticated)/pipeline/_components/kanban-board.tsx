'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { KanbanColumn } from './kanban-column'
import KanbanCard from './kanban-card'
import { KanbanSearch } from './kanban-search'
import { moveDealToStage } from '@/_actions/deal/move-deal-to-stage'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type {
  DealDto,
  DealsByStageDto,
} from '@/_data-access/deal/get-deals-by-pipeline'

interface KanbanBoardProps {
  pipeline: PipelineWithStagesDto
  dealsByStage: DealsByStageDto
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
}

export function KanbanBoard({
  pipeline,
  dealsByStage,
  onAddDeal,
  onDealClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  )

  const { execute: executeMove } = useAction(moveDealToStage, {
    onSuccess: () => {
      toast.success('Deal movido com sucesso!')
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao mover deal.')
    },
  })

  // Filtra deals pela busca
  const filteredDealsByStage = useMemo(() => {
    if (!searchQuery.trim()) return dealsByStage

    const query = searchQuery.toLowerCase()
    const filtered: DealsByStageDto = {}

    for (const stageId of Object.keys(dealsByStage)) {
      filtered[stageId] = dealsByStage[stageId].filter(
        (deal) =>
          deal.title.toLowerCase().includes(query) ||
          deal.contactName?.toLowerCase().includes(query) ||
          deal.companyName?.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [dealsByStage, searchQuery])

  // Encontra o deal ativo para o overlay
  const activeDeal = useMemo(() => {
    if (!activeId) return null
    for (const deals of Object.values(dealsByStage)) {
      const found = deals.find((d) => d.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, dealsByStage])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const dealId = active.id as string
    const overId = over.id as string

    // Determina o stageId de destino
    let targetStageId: string | null = null

    // Se soltou sobre uma coluna
    if (over.data.current?.type === 'column') {
      targetStageId = overId
    } else {
      // Se soltou sobre outro deal, pega a stage desse deal
      for (const [stageId, deals] of Object.entries(dealsByStage)) {
        if (deals.some((d) => d.id === overId)) {
          targetStageId = stageId
          break
        }
      }
    }

    if (!targetStageId) return

    // Encontra a stage atual do deal
    let currentStageId: string | null = null
    for (const [stageId, deals] of Object.entries(dealsByStage)) {
      if (deals.some((d) => d.id === dealId)) {
        currentStageId = stageId
        break
      }
    }

    // Só move se mudou de stage
    if (currentStageId && currentStageId !== targetStageId) {
      executeMove({ dealId, stageId: targetStageId })
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Search bar */}
      <KanbanSearch value={searchQuery} onChange={setSearchQuery} />

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {pipeline.stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              deals={filteredDealsByStage[stage.id] || []}
              isWonStage={stage.id === pipeline.wonStageId}
              isLostStage={stage.id === pipeline.lostStageId}
              onAddDeal={onAddDeal}
              onDealClick={onDealClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && <KanbanCard deal={activeDeal} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
