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
import { moveDealToStage } from '@/_actions/deal/move-deal-to-stage'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type {
  DealDto,
  DealsByStageDto,
} from '@/_data-access/deal/get-deals-by-pipeline'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Button } from '@/_components/ui/button'
import { ArrowUpDown, Plus } from 'lucide-react'
import type { PipelineFilters } from '../_lib/pipeline-filters'

interface KanbanBoardProps {
  pipeline: PipelineWithStagesDto
  dealsByStage: DealsByStageDto
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
  filters: PipelineFilters
  filtersSheet: React.ReactNode
  filterBadges: React.ReactNode
}

type OptimisticAction = {
  type: 'move'
  dealId: string
  fromStageId: string
  toStageId: string
}

type SortOption =
  | 'created-desc'
  | 'created-asc'
  | 'value-desc'
  | 'value-asc'
  | 'priority-desc'
  | 'title-asc'

const priorityWeight: Record<string, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
}

export function KanbanBoard({
  pipeline,
  dealsByStage,
  onAddDeal,
  onDealClick,
  filters,
  filtersSheet,
  filterBadges,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('created-desc')

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

  // Filtra e Ordena deals
  const filteredDealsByStage = useMemo(() => {
    const filtered: DealsByStageDto = {}

    for (const [stageId, deals] of Object.entries(optimisticDeals)) {
      let stageDeals = deals

      // Filtro de Status
      if (filters.status.length > 0) {
        stageDeals = stageDeals.filter((deal) =>
          filters.status.includes(deal.status),
        )
      }

      // Filtro de Prioridade
      if (filters.priority.length > 0) {
        stageDeals = stageDeals.filter((deal) =>
          filters.priority.includes(deal.priority),
        )
      }

      // Filtro de Range de Datas
      if (filters.expectedCloseDateFrom || filters.expectedCloseDateTo) {
        stageDeals = stageDeals.filter((deal) => {
          if (!deal.expectedCloseDate) return false
          const dealDate = new Date(deal.expectedCloseDate)
          if (
            filters.expectedCloseDateFrom &&
            dealDate < filters.expectedCloseDateFrom
          )
            return false
          if (
            filters.expectedCloseDateTo &&
            dealDate > filters.expectedCloseDateTo
          )
            return false
          return true
        })
      }

      // Filtro de Range de Valor
      if (filters.valueMin !== null || filters.valueMax !== null) {
        stageDeals = stageDeals.filter((deal) => {
          if (filters.valueMin !== null && deal.totalValue < filters.valueMin)
            return false
          if (filters.valueMax !== null && deal.totalValue > filters.valueMax)
            return false
          return true
        })
      }

      // Ordenação
      filtered[stageId] = [...stageDeals].sort((a, b) => {
        switch (sortBy) {
          case 'created-desc':
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            )
          case 'created-asc':
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            )
          case 'value-desc':
            return b.totalValue - a.totalValue
          case 'value-asc':
            return a.totalValue - b.totalValue
          case 'priority-desc':
            return (
              (priorityWeight[b.priority] || 0) -
              (priorityWeight[a.priority] || 0)
            )
          case 'title-asc':
            return a.title.localeCompare(b.title)
          default:
            return 0
        }
      })
    }

    return filtered
  }, [optimisticDeals, sortBy, filters])

  // Encontra o deal ativo para o overlay (usa optimisticDeals)
  const activeDeal = useMemo(() => {
    if (!activeId) return null
    for (const deals of Object.values(optimisticDeals)) {
      const found = deals.find((d) => d.id === activeId)
      if (found) return found
    }
    return null
  }, [activeId, optimisticDeals])

  const handleHeaderAddDeal = () => {
    // Abre no primeiro estágio por padrão
    const firstStageId = pipeline.stages[0]?.id
    if (firstStageId) {
      onAddDeal(firstStageId)
    }
  }

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
      {/* Sort and Filter bar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created-desc">Mais Recentes</SelectItem>
              <SelectItem value="created-asc">Mais Antigos</SelectItem>
              <SelectItem value="value-desc">Maior Valor</SelectItem>
              <SelectItem value="value-asc">Menor Valor</SelectItem>
              <SelectItem value="priority-desc">Prioridade</SelectItem>
              <SelectItem value="title-asc">A-Z</SelectItem>
            </SelectContent>
          </Select>
          {filtersSheet}
          <div className="flex-1" />
          <Button onClick={handleHeaderAddDeal}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Negociação
          </Button>
        </div>
        {filterBadges}
      </div>
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
