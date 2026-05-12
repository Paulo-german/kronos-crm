'use client'

import { useState, useEffect, useRef, useId, useMemo } from 'react'
import {
  Plus,
  GripVertical,
  AlertTriangle,
  Loader2,
  ChevronDown,
  X,
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import StepDetailPanel from './step-detail-panel'
import { reorderSteps } from '@/_actions/agent/reorder-steps'
import { migrateStepToolsToGlobal } from '@/_actions/agent/migrate-step-tools-to-global'
import type {
  AgentDetailDto,
  AgentStepDto,
} from '@/_data-access/agent/get-agent-by-id'
import type { GlobalToolType } from '@/_actions/agent/shared/global-tool-schema'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'

const GLOBAL_TOOL_TYPES: GlobalToolType[] = [
  'hand_off_to_human',
  'update_contact',
  'update_deal',
  'create_task',
]

const ACTION_TYPE_COLORS: Record<string, string> = {
  move_deal:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  create_task:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update_deal:
    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  hand_off_to_human:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  list_availability:
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  create_event:
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  update_contact:
    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  move_deal: 'Mover negócio',
  create_task: 'Criar tarefa',
  update_deal: 'Atualizar negócio',
  hand_off_to_human: 'Envolver humano',
  list_availability: 'Listar agenda',
  create_event: 'Criar evento',
  update_contact: 'Atualizar contato',
  create_appointment: 'Agendar Serviço',
}

const PRODUCT_ONLY_TOOL_TYPES = new Set(['list_availability', 'create_event'])
const SERVICE_ONLY_TOOL_TYPES = new Set(['create_appointment'])

const isToolIncompatible = (type: string, agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'): boolean => {
  if (!agentMode || agentMode === 'HYBRID') return false
  if (agentMode === 'PRODUCT') return SERVICE_ONLY_TOOL_TYPES.has(type)
  return PRODUCT_ONLY_TOOL_TYPES.has(type)
}

interface ActionBadgesProps {
  actions: StepAction[]
  agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'
}

const ActionBadges = ({ actions, agentMode }: ActionBadgesProps) => {
  const visible = actions.slice(0, 3)
  const overflow = actions.length - visible.length
  return (
    <div className="hidden items-center gap-1 sm:flex">
      {visible.map((action, index) => {
        const incompatible = isToolIncompatible(action.type, agentMode)
        return (
          <Badge
            key={index}
            variant="secondary"
            className={cn(
              'px-1.5 py-0 text-[10px] font-medium',
              incompatible
                ? 'bg-muted text-muted-foreground/50 line-through'
                : ACTION_TYPE_COLORS[action.type],
            )}
          >
            {ACTION_TYPE_LABELS[action.type] ?? action.type}
          </Badge>
        )
      })}
      {overflow > 0 && (
        <Badge
          variant="secondary"
          className="px-1.5 py-0 text-[10px] font-medium"
        >
          +{overflow}
        </Badge>
      )}
    </div>
  )
}

interface SortableStepCardProps {
  step: AgentStepDto
  index: number
  isOpen: boolean
  canManage: boolean
  onToggle: (id: string) => void
  agentId: string
  pipelineStages: PipelineStageOption[]
  onCreateSuccess: () => void
  onDeleteSuccess: (id: string) => void
  onSaveSuccess?: () => void
  excludeGlobalTools?: boolean
  agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'
}

const SortableStepCard = ({
  step,
  index,
  isOpen,
  canManage,
  onToggle,
  agentId,
  pipelineStages,
  onCreateSuccess,
  onDeleteSuccess,
  onSaveSuccess,
  excludeGlobalTools,
  agentMode,
}: SortableStepCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'overflow-hidden rounded-lg border bg-card transition-shadow',
        isOpen && 'shadow-sm',
      )}
    >
      <Collapsible
        open={isOpen}
        onOpenChange={() => onToggle(step.id)}
        className="w-full"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full min-w-0 items-center gap-3 overflow-hidden px-4 py-3 text-left transition-colors hover:bg-muted/30"
          >
            {canManage && (
              <span
                className="shrink-0 cursor-grab touch-none text-muted-foreground"
                onClick={(e) => e.stopPropagation()}
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-4 w-4" />
              </span>
            )}
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-sm font-semibold">
                {step.name}
              </span>
              {!isOpen && (
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {step.objective}
                </span>
              )}
            </span>
            {!isOpen && step.actions.length > 0 && (
              <ActionBadges actions={step.actions} agentMode={agentMode} />
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            <StepDetailPanel
              step={step}
              agentId={agentId}
              canManage={canManage}
              pipelineStages={pipelineStages}
              onCreateSuccess={onCreateSuccess}
              onDeleteSuccess={() => onDeleteSuccess(step.id)}
              onSaveSuccess={onSaveSuccess}
              excludeGlobalTools={excludeGlobalTools}
              agentMode={agentMode}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}

interface ProcessTabProps {
  agent: AgentDetailDto
  canManage: boolean
  pipelineStages: PipelineStageOption[]
  onSaveSuccess?: () => void
  excludeGlobalTools?: boolean
}

const ProcessTab = ({
  agent,
  canManage,
  pipelineStages,
  onSaveSuccess,
  excludeGlobalTools = false,
}: ProcessTabProps) => {
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [steps, setSteps] = useState<AgentStepDto[]>(agent.steps)
  const [openStepId, setOpenStepId] = useState<string | 'new' | null>(null)
  const selectLastRef = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    setSteps(agent.steps)

    if (selectLastRef.current) {
      selectLastRef.current = false
      const lastStep = agent.steps[agent.steps.length - 1]
      setOpenStepId(lastStep?.id ?? null)
    }
  }, [agent.steps])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const { execute: executeReorder } = useAction(reorderSteps, {
    onSuccess: () => {
      toast.success('Ordem das etapas atualizada!')
    },
    onError: ({ error }) => {
      setSteps(agent.steps)
      toast.error(error.serverError || 'Erro ao reordenar etapas.')
    },
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = steps.findIndex((step) => step.id === active.id)
    const newIndex = steps.findIndex((step) => step.id === over.id)
    const newOrder = arrayMove(steps, oldIndex, newIndex)

    setSteps(newOrder)
    executeReorder({
      agentId: agent.id,
      stepIds: newOrder.map((step) => step.id),
    })
  }

  const handleToggleStep = (id: string) => {
    setOpenStepId((curr) => (curr === id ? null : id))
  }

  const handleAddStep = () => {
    setOpenStepId('new')
  }

  const handleCreateSuccess = () => {
    selectLastRef.current = true
  }

  const handleDeleteSuccess = (id: string) => {
    if (openStepId === id) {
      setOpenStepId(null)
    }
  }

  const { execute: executeMigrate, isPending: isMigrating } = useAction(
    migrateStepToolsToGlobal,
    {
      onSuccess: () => {
        toast.success('Ferramentas migradas com sucesso')
        setSteps((current) =>
          current.map((step) => ({
            ...step,
            actions: step.actions.filter(
              (action) =>
                !GLOBAL_TOOL_TYPES.includes(action.type as GlobalToolType),
            ),
          })),
        )
      },
      onError: () => {
        toast.error('Erro ao migrar ferramentas')
      },
    },
  )

  const stepsWithGlobalTools = useMemo(
    () =>
      steps.filter((step) =>
        step.actions.some((action) =>
          GLOBAL_TOOL_TYPES.includes(action.type as GlobalToolType),
        ),
      ),
    [steps],
  )
  const hasMigrationPending = stepsWithGlobalTools.length > 0

  const stepCards = steps.map((step, index) => (
    <SortableStepCard
      key={step.id}
      step={step}
      index={index}
      isOpen={openStepId === step.id}
      canManage={canManage}
      onToggle={handleToggleStep}
      agentId={agent.id}
      pipelineStages={pipelineStages}
      onCreateSuccess={handleCreateSuccess}
      onDeleteSuccess={handleDeleteSuccess}
      onSaveSuccess={onSaveSuccess}
      excludeGlobalTools={excludeGlobalTools}
      agentMode={agent.agentMode}
    />
  ))

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {excludeGlobalTools && hasMigrationPending && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {stepsWithGlobalTools.length} etapa(s) têm ferramentas que agora
              são globais. Migre para evitar perda de configuração ao editar
              essas etapas.
            </span>
            <Button
              size="sm"
              variant="soft"
              disabled={isMigrating}
              onClick={() => executeMigrate({ agentId: agent.id })}
            >
              {isMigrating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Migrar agora
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="container flex min-w-0 flex-col gap-2">
        {steps.length === 0 && openStepId !== 'new' && (
          <div className="flex items-center justify-center rounded-lg border border-dashed py-10">
            <p className="text-sm text-muted-foreground">
              Nenhuma etapa configurada.
            </p>
          </div>
        )}

        {isMounted && canManage ? (
          <DndContext
            id={dndContextId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={steps.map((step) => step.id)}
              strategy={verticalListSortingStrategy}
            >
              {stepCards}
            </SortableContext>
          </DndContext>
        ) : (
          stepCards
        )}

        {openStepId === 'new' && (
          <div className="container overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {steps.length + 1}
                </span>
                <span className="text-sm font-semibold">Nova etapa</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setOpenStepId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <StepDetailPanel
              agentId={agent.id}
              canManage={canManage}
              pipelineStages={pipelineStages}
              onCreateSuccess={handleCreateSuccess}
              onDeleteSuccess={() => setOpenStepId(null)}
              onSaveSuccess={onSaveSuccess}
              excludeGlobalTools={excludeGlobalTools}
              agentMode={agent.agentMode}
            />
          </div>
        )}
      </div>

      {canManage && openStepId !== 'new' && (
        <Button variant="outline" className="w-full" onClick={handleAddStep}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Etapa
        </Button>
      )}
    </div>
  )
}

export default ProcessTab
