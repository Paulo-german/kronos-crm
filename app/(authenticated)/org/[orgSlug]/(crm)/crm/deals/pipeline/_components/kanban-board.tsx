'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'
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
import KanbanCard, { priorityConfig } from './kanban-card'
import { moveDealToStage } from '@/_actions/deal/move-deal-to-stage'
import { updateDealPriority } from '@/_actions/deal/update-deal-priority'
import type { PipelineWithStagesDto } from '@/_data-access/pipeline/get-user-pipeline'
import type { DealDto } from '@/_data-access/deal/get-deals-by-pipeline'
import type { PipelineStageDealsResult } from '@/_data-access/deal/get-deals-by-pipeline-stage'
import { usePipelineAggregates } from '../_hooks/use-pipeline-aggregates'
import {
  buildPipelineQueryInput,
  pipelineDealsKey,
} from '../_lib/pipeline-deals-query'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Badge } from '@/_components/ui/badge'
import {
  ArrowUpDown,
  User,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import type { MemberRole } from '@prisma/client'
import type { DealFilters } from '../../_lib/deal-filters'
import type { SortOption } from '../_lib/use-pipeline-filters'
import type { MemberOption } from './pipeline-client'

interface KanbanBoardProps {
  pipeline: PipelineWithStagesDto
  members: MemberOption[]
  currentUserId: string
  userRole: MemberRole
  onAddDeal: (stageId: string) => void
  onDealClick: (deal: DealDto) => void
  filters: DealFilters
  sortBy: SortOption
  onSortChange: (value: SortOption) => void
  assignees: string[]
  onAssigneesChange: (values: string[]) => void
  viewToggle: React.ReactNode
  pipelineSelector?: React.ReactNode
  refreshButton?: React.ReactNode
  settingsButton: React.ReactNode
  createButton: React.ReactNode
  filtersSheet: React.ReactNode
  filterBadges: React.ReactNode
}

type InfiniteDeals = InfiniteData<PipelineStageDealsResult>

export function KanbanBoard({
  pipeline,
  members,
  currentUserId,
  userRole,
  onAddDeal,
  onDealClick,
  filters,
  sortBy,
  onSortChange,
  assignees,
  onAssigneesChange,
  viewToggle,
  pipelineSelector,
  refreshButton,
  settingsButton,
  createButton,
  filtersSheet,
  filterBadges,
}: KanbanBoardProps) {
  const isMember = userRole === 'MEMBER'

  // MEMBER sempre filtra pelos próprios deals (RBAC)
  const effectiveAssignees = useMemo(
    () => (isMember ? [currentUserId] : assignees),
    [isMember, currentUserId, assignees],
  )

  // Singleton priority popover
  const [priorityPopover, setPriorityPopover] = useState<{
    dealId: string
  } | null>(null)
  const [priorityOverrides, setPriorityOverrides] = useState<
    Record<string, string>
  >({})

  // Virtual anchor para posicionar o Popover no botão clicado
  const anchorRef = useRef<{ getBoundingClientRect: () => DOMRect }>({
    getBoundingClientRect: () => new DOMRect(),
  })

  // Scroll horizontal do board
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const queryClient = useQueryClient()

  // Input serializável dos filtros/sort — chave das queries por coluna e dos agregados
  const queryInput = useMemo(
    () => buildPipelineQueryInput(sortBy, filters, effectiveAssignees),
    [sortBy, filters, effectiveAssignees],
  )

  const stageIds = useMemo(
    () => pipeline.stages.map((stage) => stage.id),
    [pipeline.stages],
  )

  // Agregados (count + soma de valor) por estágio — refletem o total real, não o carregado
  const aggregates = usePipelineAggregates(pipeline.id, stageIds, queryInput)

  // Deal sendo arrastado: capturado do cache no dragStart para o DragOverlay
  const [activeDeal, setActiveDeal] = useState<DealDto | null>(null)

  // Localiza um deal e seu estágio varrendo o cache das colunas (só durante o drag)
  const findDealInCache = useCallback(
    (dealId: string): { stageId: string; deal: DealDto } | null => {
      const entries = queryClient.getQueriesData<InfiniteDeals>({
        queryKey: ['pipeline-deals'],
      })
      for (const [key, data] of entries) {
        if (!data) continue
        const stageId = key[1] as string
        for (const page of data.pages) {
          const found = page.deals.find((deal) => deal.id === dealId)
          if (found) return { stageId, deal: found }
        }
      }
      return null
    },
    [queryClient],
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
      toast.success('Negociação movida com sucesso!')
      // Recontagem dos headers após mover entre colunas
      void queryClient.invalidateQueries({ queryKey: ['pipeline-aggregates'] })
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao mover negociação.')
      // Reverte para a verdade do servidor
      void queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline-aggregates'] })
    },
  })

  // Priority update (singleton — antes era duplicado em cada card)
  const { execute: executeUpdatePriority } = useAction(updateDealPriority, {
    onSuccess: ({ input }) => {
      setPriorityOverrides((prev) => {
        const next = { ...prev }
        delete next[input.dealId]
        return next
      })
      // Reflete a prioridade persistida (e eventual saída por filtro de prioridade)
      void queryClient.invalidateQueries({ queryKey: ['pipeline-deals'] })
      void queryClient.invalidateQueries({ queryKey: ['pipeline-aggregates'] })
    },
    onError: ({ error, input }) => {
      setPriorityOverrides((prev) => {
        const next = { ...prev }
        delete next[input.dealId]
        return next
      })
      toast.error(error.serverError || 'Erro ao atualizar prioridade.')
    },
  })

  const handleDragStart = (event: DragStartEvent) => {
    const dealId = event.active.id as string
    setActiveDeal(findDealInCache(dealId)?.deal ?? null)
  }

  // Move otimista no cache: remove da coluna origem, insere no topo da destino
  const applyOptimisticMove = (
    dealId: string,
    deal: DealDto,
    fromStageId: string,
    toStageId: string,
  ) => {
    queryClient.setQueryData<InfiniteDeals>(
      pipelineDealsKey(fromStageId, queryInput),
      (old) =>
        old
          ? {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                deals: page.deals.filter((item) => item.id !== dealId),
              })),
            }
          : old,
    )
    queryClient.setQueryData<InfiniteDeals>(
      pipelineDealsKey(toStageId, queryInput),
      (old) => {
        if (!old || old.pages.length === 0) return old
        const movedDeal: DealDto = { ...deal, stageId: toStageId }
        return {
          ...old,
          pages: old.pages.map((page, index) =>
            index === 0 ? { ...page, deals: [movedDeal, ...page.deals] } : page,
          ),
        }
      },
    )
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDeal(null)

    if (!over) return

    const dealId = active.id as string
    const overId = over.id as string

    // Determina o stageId de destino
    const targetStageId =
      over.data.current?.type === 'column'
        ? overId
        : (findDealInCache(overId)?.stageId ?? null)

    if (!targetStageId) return

    const current = findDealInCache(dealId)
    const currentStageId = current?.stageId ?? null

    // Só move se mudou de stage
    if (current && currentStageId && currentStageId !== targetStageId) {
      applyOptimisticMove(dealId, current.deal, currentStageId, targetStageId)
      executeMove({ dealId, stageId: targetStageId })
    }
  }

  // Singleton: abre o Popover de prioridade posicionado no botão clicado
  const handlePriorityClick = useCallback(
    (dealId: string, anchorEl: HTMLElement) => {
      anchorRef.current = {
        getBoundingClientRect: () => anchorEl.getBoundingClientRect(),
      }
      setPriorityPopover({ dealId })
    },
    [],
  )

  const handlePrioritySelect = useCallback(
    (newPriority: string) => {
      if (!priorityPopover) return
      const { dealId } = priorityPopover
      const validPriority = newPriority as 'low' | 'medium' | 'high' | 'urgent'

      // Optimistic update via override
      setPriorityOverrides((prev) => ({ ...prev, [dealId]: validPriority }))
      setPriorityPopover(null)

      executeUpdatePriority({ dealId, priority: validPriority })
    },
    [priorityPopover, executeUpdatePriority],
  )

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    updateScrollState()
  }, [updateScrollState, pipeline.stages])

  const handleScrollLeft = () =>
    scrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })
  const handleScrollRight = () =>
    scrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Toolbar row 1: Navigation + Actions */}
      <div className="flex items-center gap-2">
        {viewToggle}
        <div className="flex-1" />
        {refreshButton}
        {settingsButton}
        {createButton}
      </div>

      {/* Toolbar row 2: Pipeline + Sort + Assignee + Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {pipelineSelector}
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as SortOption)}
          >
            <SelectTrigger className="w-[300px] border-border-strong bg-background">
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
          <Popover>
            <PopoverTrigger asChild disabled={isMember}>
              <Button
                variant="outline"
                className="relative w-[300px] justify-center border-border-strong bg-background font-normal hover:bg-accent"
              >
                <User className="absolute left-3 h-4 w-4 text-muted-foreground" />
                {effectiveAssignees.length === 0 ? (
                  'Todos os responsáveis'
                ) : effectiveAssignees.length === 1 ? (
                  (members.find(
                    (member) => member.userId === effectiveAssignees[0],
                  )?.name ?? 'Responsável')
                ) : (
                  <span className="flex items-center gap-1.5">
                    Responsáveis
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {effectiveAssignees.length}
                    </Badge>
                  </span>
                )}
                <ChevronDown className="absolute right-3 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-2" align="start">
              {members.map((member) => {
                const isSelected = effectiveAssignees.includes(member.userId)
                return (
                  <button
                    key={member.userId}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      const next = isSelected
                        ? effectiveAssignees.filter(
                            (id) => id !== member.userId,
                          )
                        : [...effectiveAssignees, member.userId]
                      onAssigneesChange(next)
                    }}
                  >
                    <Check
                      className={cn(
                        'h-4 w-4',
                        isSelected ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    {member.name}
                  </button>
                )
              })}
              {effectiveAssignees.length > 0 && (
                <>
                  <div className="my-1 border-t" />
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                    onClick={() => onAssigneesChange([])}
                  >
                    Limpar filtro
                  </button>
                </>
              )}
            </PopoverContent>
          </Popover>
          {filtersSheet}
        </div>
        {filterBadges}
      </div>
      {/* Kanban board */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollLeft}
            className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-primary shadow-md hover:bg-primary"
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </Button>
        )}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleScrollRight}
            className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-primary shadow-md hover:bg-primary"
          >
            <ChevronRight className="h-4 w-4 text-white" />
          </Button>
        )}
        <DndContext
          id="kanban-board"
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={scrollRef}
            data-tour="deals-card"
            onScroll={updateScrollState}
            className="flex min-h-0 flex-1 gap-4 overflow-x-auto overflow-y-hidden pb-4 [scrollbar-color:hsl(var(--primary))_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb:hover]:bg-primary [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:h-1.5"
          >
            {pipeline.stages.map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                queryInput={queryInput}
                count={aggregates[stage.id]?.count ?? 0}
                totalValue={aggregates[stage.id]?.totalValue ?? 0}
                onAddDeal={onAddDeal}
                onDealClick={onDealClick}
                onPriorityClick={handlePriorityClick}
                priorityOverrides={priorityOverrides}
                showIdleDays={pipeline.showIdleDays}
              />
            ))}
          </div>

          <DragOverlay>
            {activeDeal && (
              <div className="rotate-2 scale-105 rounded-lg shadow-2xl ring-2 ring-primary/30">
                <KanbanCard
                  deal={activeDeal}
                  priorityOverride={priorityOverrides[activeDeal.id]}
                  showIdleDays={pipeline.showIdleDays}
                />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Singleton Priority Popover — 1 instância para todo o board */}
      <Popover
        open={!!priorityPopover}
        onOpenChange={(open) => {
          if (!open) setPriorityPopover(null)
        }}
      >
        <PopoverAnchor virtualRef={anchorRef} />
        <PopoverContent
          align="start"
          side="bottom"
          className="w-auto min-w-[120px] p-1"
        >
          <p className="px-2 py-1.5 text-xs font-bold uppercase text-muted-foreground">
            Prioridade
          </p>
          {Object.entries(priorityConfig).map(([key, config]) => (
            <button
              key={key}
              type="button"
              className={`flex w-full items-center rounded-sm px-2 py-1.5 text-left text-[10px] font-medium transition-colors hover:bg-accent ${config.color}`}
              onClick={() => handlePrioritySelect(key)}
            >
              {config.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}
