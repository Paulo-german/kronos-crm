'use client'

import { useState, useEffect, useRef, useId, useMemo } from 'react'
import { Plus, ListChecks, ChevronRight, GripVertical, AlertTriangle, Loader2, Save, ChevronDown, Wrench } from 'lucide-react'
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
import { Alert, AlertDescription } from '@/_components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { ScrollArea } from '@/_components/ui/scroll-area'
import StepDetailPanel from './step-detail-panel'
import GlobalToolBuilder from './v2/global-tool-builder'
import { reorderSteps } from '@/_actions/agent/reorder-steps'
import { migrateStepToolsToGlobal } from '@/_actions/agent/migrate-step-tools-to-global'
import { updateAgentGlobalTools } from '@/_actions/agent/update-agent-global-tools'
import type {
  AgentDetailDto,
  AgentStepDto,
} from '@/_data-access/agent/get-agent-by-id'
import type { GlobalTool, GlobalToolType } from '@/_actions/agent/shared/global-tool-schema'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

const GLOBAL_TOOL_TYPES: GlobalToolType[] = [
  'hand_off_to_human',
  'update_contact',
  'update_deal',
  'create_task',
]

interface SortableStepItemProps {
  step: AgentStepDto
  index: number
  isSelected: boolean
  canManage: boolean
  onSelect: (id: string) => void
}

const SortableStepItem = ({
  step,
  index,
  isSelected,
  canManage,
  onSelect,
}: SortableStepItemProps) => {
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
    <div ref={setNodeRef} style={style} className="flex items-center">
      {canManage && (
        <button
          type="button"
          className="cursor-grab touch-none px-1 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}
      <Button
        variant="ghost"
        className={cn(
          'flex-1 justify-start gap-2 px-3 font-normal',
          isSelected && 'bg-muted font-medium text-foreground',
        )}
        onClick={() => onSelect(step.id)}
      >
        <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">
          {index + 1}
        </span>
        <span className="flex-1 truncate text-left">{step.name}</span>
        {isSelected && (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}

interface ProcessTabProps {
  agent: AgentDetailDto
  canManage: boolean
  pipelineStages: PipelineStageOption[]
  onSaveSuccess?: () => void
  excludeGlobalTools?: boolean
  showGlobalTools?: boolean
}

const ProcessTab = ({ agent, canManage, pipelineStages, onSaveSuccess, excludeGlobalTools = false, showGlobalTools = false }: ProcessTabProps) => {
  const dndContextId = useId()
  const [isMounted, setIsMounted] = useState(false)
  const [steps, setSteps] = useState<AgentStepDto[]>(agent.steps)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    agent.steps[0]?.id ?? null,
  )
  const selectLastRef = useRef(false)
  const [globalTools, setGlobalTools] = useState<GlobalTool[]>(agent.globalTools)
  const [isGlobalToolsOpen, setIsGlobalToolsOpen] = useState(false)

  const { execute: executeSaveGlobalTools, isPending: isSavingGlobalTools } = useAction(
    updateAgentGlobalTools,
    {
      onSuccess: () => {
        toast.success('Ferramentas globais salvas!')
        onSaveSuccess?.()
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Falha ao salvar ferramentas globais.')
      },
    },
  )

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Sincroniza estado local com props do servidor após revalidação
  useEffect(() => {
    setSteps(agent.steps)

    // Após create, seleciona o último step adicionado
    if (selectLastRef.current) {
      selectLastRef.current = false
      const lastStep = agent.steps[agent.steps.length - 1]
      setSelectedStepId(lastStep?.id ?? null)
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

  const handleAddStep = () => {
    setSelectedStepId(null)
  }

  const handleCreateSuccess = () => {
    selectLastRef.current = true
  }

  const handleDeleteSuccess = () => {
    const remaining = steps.filter((step) => step.id !== selectedStepId)
    setSelectedStepId(remaining[0]?.id ?? null)
  }

  const { execute: executeMigrate, isPending: isMigrating } = useAction(
    migrateStepToolsToGlobal,
    {
      onSuccess: () => {
        toast.success('Ferramentas migradas com sucesso')
        // Remove as global tools das actions localmente para o banner sumir sem reload
        setSteps((current) =>
          current.map((step) => ({
            ...step,
            actions: step.actions.filter(
              (action) => !GLOBAL_TOOL_TYPES.includes(action.type as GlobalToolType),
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

  const selectedStep = steps.find((step) => step.id === selectedStepId)
  const showEmptyRight = !canManage && steps.length === 0

  const stepList = (
    <div className="p-1">
      {steps.map((step, index) => (
        <SortableStepItem
          key={step.id}
          step={step}
          index={index}
          isSelected={selectedStepId === step.id}
          canManage={canManage}
          onSelect={setSelectedStepId}
        />
      ))}
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      {excludeGlobalTools && hasMigrationPending && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {stepsWithGlobalTools.length} etapa(s) têm ferramentas que agora são globais. Migre para evitar perda de configuração ao editar essas etapas.
            </span>
            <Button
              size="sm"
              variant="outline"
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
    <div className="grid grid-cols-[320px_1fr] items-start gap-6">
      {/* Coluna esquerda: lista de etapas */}
      <div className="sticky top-1 flex flex-col gap-3">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">
              Etapas do Processo
            </CardTitle>
            <CardDescription>
              Selecione uma etapa para configurar.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            <ScrollArea className="max-h-80">
              {steps.length === 0 ? (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhuma etapa configurada.
                </p>
              ) : isMounted && canManage ? (
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
                    {stepList}
                  </SortableContext>
                </DndContext>
              ) : (
                stepList
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {canManage && (
          <Button variant="outline" className="w-full" onClick={handleAddStep}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Etapa
          </Button>
        )}

        {showGlobalTools && (
          <Collapsible open={isGlobalToolsOpen} onOpenChange={setIsGlobalToolsOpen}>
            <Card className="border-border/50 bg-card">
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Ferramentas Globais</span>
                    {globalTools.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {globalTools.length}
                      </span>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform',
                      isGlobalToolsOpen && 'rotate-180',
                    )}
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Disponíveis em qualquer etapa da conversa.
                  </p>
                  <GlobalToolBuilder value={globalTools} onChange={setGlobalTools} />
                  {canManage && (
                    <div className="flex justify-end pt-1">
                      <Button
                        size="sm"
                        disabled={isSavingGlobalTools}
                        onClick={() => executeSaveGlobalTools({ agentId: agent.id, globalTools })}
                        type="button"
                      >
                        {isSavingGlobalTools ? (
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-3.5 w-3.5" />
                        )}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      {/* Coluna direita: painel de detalhes */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Configuração da Etapa
          </CardTitle>
          <CardDescription>
            Defina o nome, objetivo e ações desta etapa.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {showEmptyRight ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="rounded-full bg-muted p-4">
                <ListChecks className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Nenhuma etapa configurada.
              </p>
            </div>
          ) : (
            <StepDetailPanel
              key={selectedStepId ?? 'new'}
              step={selectedStep}
              agentId={agent.id}
              canManage={canManage}
              pipelineStages={pipelineStages}
              onCreateSuccess={handleCreateSuccess}
              onDeleteSuccess={handleDeleteSuccess}
              onSaveSuccess={onSaveSuccess}
              excludeGlobalTools={excludeGlobalTools}
            />
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  )
}

export default ProcessTab
