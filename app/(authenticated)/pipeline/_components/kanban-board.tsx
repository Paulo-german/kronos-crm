'use client'

import { useState, useMemo, useOptimistic, startTransition } from 'react'
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

type OptimisticAction = {
  type: 'move'
  dealId: string
  fromStageId: string
  toStageId: string
}

export function KanbanBoard({
  pipeline,
  dealsByStage,
  onAddDeal,
  onDealClick,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Optimistic state: atualiza instantaneamente a UI antes do servidor responder
  const [optimisticDeals, setOptimisticDeals] = useOptimistic(
    dealsByStage,
    (state: DealsByStageDto, action: OptimisticAction) => {
      if (action.type === 'move') {
        const newState = { ...state }
        const deal = newState[action.fromStageId]?.find(
          (d) => d.id === action.dealId,
        )

        if (!deal) return state

        // Remove da coluna antiga
        newState[action.fromStageId] = newState[action.fromStageId].filter(
          (d) => d.id !== action.dealId,
        )

        // Adiciona na nova coluna
        if (!newState[action.toStageId]) {
          newState[action.toStageId] = []
        }
        newState[action.toStageId] = [...newState[action.toStageId], deal]

        return newState
      }
      return state
    },
  )

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
      // O useOptimistic reverte automaticamente em caso de erro
    },
  })

  // Filtra deals pela busca (usa optimisticDeals em vez de dealsByStage)
  const filteredDealsByStage = useMemo(() => {
    if (!searchQuery.trim()) return optimisticDeals

    const query = searchQuery.toLowerCase()
    const filtered: DealsByStageDto = {}

    for (const stageId of Object.keys(optimisticDeals)) {
      filtered[stageId] = optimisticDeals[stageId].filter(
        (deal) =>
          deal.title.toLowerCase().includes(query) ||
          deal.contactName?.toLowerCase().includes(query) ||
          deal.companyName?.toLowerCase().includes(query),
      )
    }

    return filtered
  }, [optimisticDeals, searchQuery])

  // Encontra o deal ativo para o overlay (usa optimisticDeals)
  const activeDeal = useMemo(() => {
    if (!activeId) return null
    for (const deals of Object.values(optimisticDeals)) {
      const found = deals.find((d) => d.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, optimisticDeals])

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
      for (const [stageId, deals] of Object.entries(optimisticDeals)) {
        if (deals.some((d) => d.id === overId)) {
          targetStageId = stageId
          break
        }
      }
    }

    if (!targetStageId) return

    // Encontra a stage atual do deal
    let currentStageId: string | null = null
    for (const [stageId, deals] of Object.entries(optimisticDeals)) {
      if (deals.some((d) => d.id === dealId)) {
        currentStageId = stageId
        break
      }
    }

    // Só move se mudou de stage
    if (currentStageId && currentStageId !== targetStageId) {
      startTransition(() => {
        // 1. Atualiza a UI imediatamente (Optimistic Update)
        setOptimisticDeals({
          type: 'move',
          dealId,
          fromStageId: currentStageId!,
          toStageId: targetStageId!,
        })

        // 2. Chama o servidor em background
        executeMove({ dealId, stageId: targetStageId! })
      })
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
