'use client'

import { useState } from 'react'
import { Plus, ChevronDown, X, Zap, CheckSquare, MapPin } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent } from '@/_components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AutoTaskItem } from '@/_actions/agent/shared/step-fields-schema'

interface StepAutomationsSectionProps {
  autoDealStageId: string | null
  autoTasks: AutoTaskItem[] | null
  onAutoDealStageIdChange: (val: string | null) => void
  onAutoTasksChange: (val: AutoTaskItem[]) => void
  pipelineStages: PipelineStageOption[]
}

// Identificadores estáveis para expanded state — não dependem de UUIDs externos
const MOVE_DEAL_ID = 'auto_move_deal'
const taskId = (index: number) => `auto_task_${index}`

const NONE_VALUE = '__none__'

const AUTOMATION_OPTIONS = [
  { value: 'move_deal', label: 'Mover negócio de etapa' },
  { value: 'create_task', label: 'Criar tarefa' },
] as const

const StepAutomationsSection = ({
  autoDealStageId,
  autoTasks,
  onAutoDealStageIdChange,
  onAutoTasksChange,
  pipelineStages,
}: StepAutomationsSectionProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const tasks = autoTasks ?? []
  const hasMoveDeal = autoDealStageId !== null

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addAutomation = (type: 'move_deal' | 'create_task') => {
    if (type === 'move_deal') {
      onAutoDealStageIdChange('')
      setExpandedIds((prev) => new Set(prev).add(MOVE_DEAL_ID))
    } else {
      onAutoTasksChange([...tasks, { title: '', dueInDays: 1 }])
      const newIndex = tasks.length
      setExpandedIds((prev) => new Set(prev).add(taskId(newIndex)))
    }
  }

  const removeMoveDeal = () => {
    onAutoDealStageIdChange(null)
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(MOVE_DEAL_ID)
      return next
    })
  }

  const removeTask = (index: number) => {
    onAutoTasksChange(tasks.filter((_, taskIndex) => taskIndex !== index))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(taskId(index))
      return next
    })
  }

  const updateTask = (index: number, patch: Partial<AutoTaskItem>) => {
    onAutoTasksChange(
      tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, ...patch } : task)),
    )
  }

  const groupedStages = pipelineStages.reduce<
    Record<string, { pipelineName: string; stages: PipelineStageOption[] }>
  >((acc, stage) => {
    if (!acc[stage.pipelineId]) {
      acc[stage.pipelineId] = { pipelineName: stage.pipelineName, stages: [] }
    }
    acc[stage.pipelineId].stages.push(stage)
    return acc
  }, {})

  const hasMultiplePipelines = Object.keys(groupedStages).length > 1

  const stageName = (stageId: string) =>
    pipelineStages.find((stage) => stage.stageId === stageId)?.stageName ?? null

  const availableToAdd = AUTOMATION_OPTIONS.filter(
    (option) => !(option.value === 'move_deal' && hasMoveDeal),
  )

  const hasItems = hasMoveDeal || tasks.length > 0

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Automações ao entrar na etapa</Label>
      <p className="text-xs text-muted-foreground">
        Executadas automaticamente quando o agente avança para esta etapa, sem envolver o LLM.
      </p>

      <div className="space-y-2">
        {hasMoveDeal && (
          <Collapsible
            open={expandedIds.has(MOVE_DEAL_ID)}
            onOpenChange={() => toggle(MOVE_DEAL_ID)}
          >
            <Card className="border-indigo-500/30 bg-indigo-500/5">
              <CardContent className="p-0">
                <div className="flex items-center pr-2">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <Zap className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                          <span className="text-sm font-medium">Mover negócio de etapa</span>
                        </div>
                        {!expandedIds.has(MOVE_DEAL_ID) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                            {autoDealStageId && stageName(autoDealStageId) ? (
                              <>
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{stageName(autoDealStageId)}</span>
                              </>
                            ) : (
                              <span className="text-amber-600">Etapa não definida</span>
                            )}
                          </span>
                        )}
                      </div>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                          expandedIds.has(MOVE_DEAL_ID) && 'rotate-180',
                        )}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={removeMoveDeal}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <CollapsibleContent>
                  <div className="space-y-3 border-t px-4 pb-4 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Etapa de destino *</Label>
                      <Select
                        value={autoDealStageId || NONE_VALUE}
                        onValueChange={(val) =>
                          onAutoDealStageIdChange(val === NONE_VALUE ? null : val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a etapa do pipeline" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(groupedStages).map(([pipelineId, group]) => (
                            <SelectGroup key={pipelineId}>
                              {hasMultiplePipelines && (
                                <SelectLabel>{group.pipelineName}</SelectLabel>
                              )}
                              {group.stages.map((stage) => (
                                <SelectItem key={stage.stageId} value={stage.stageId}>
                                  {hasMultiplePipelines
                                    ? `${group.pipelineName} → ${stage.stageName}`
                                    : stage.stageName}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Card>
          </Collapsible>
        )}

        {tasks.map((task, index) => {
          const id = taskId(index)
          const isOpen = expandedIds.has(id)

          return (
            <Collapsible
              key={id}
              open={isOpen}
              onOpenChange={() => toggle(id)}
            >
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="p-0">
                  <div className="flex items-center pr-2">
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="h-3.5 w-3.5 shrink-0 text-green-600" />
                            <span className="text-sm font-medium">Criar tarefa</span>
                            {tasks.length > 1 && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1.5 text-[10px] font-medium"
                              >
                                #{index + 1}
                              </Badge>
                            )}
                          </div>
                          {!isOpen && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
                              {task.title ? (
                                <>
                                  <span className="truncate">&ldquo;{task.title}&rdquo;</span>
                                  <span className="text-muted-foreground/40">·</span>
                                  <span>{task.dueInDays} {task.dueInDays === 1 ? 'dia' : 'dias'}</span>
                                </>
                              ) : (
                                <span className="text-amber-600">Título não definido</span>
                              )}
                            </span>
                          )}
                        </div>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                            isOpen && 'rotate-180',
                          )}
                        />
                      </button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTask(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <CollapsibleContent>
                    <div className="space-y-3 border-t px-4 pb-4 pt-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Título da tarefa *</Label>
                        <Input
                          placeholder="Ex: Ligar para o lead"
                          value={task.title}
                          onChange={(event) => updateTask(index, { title: event.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Prazo (em dias a partir da entrada na etapa) *</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Ex: 2"
                          value={task.dueInDays}
                          onChange={(event) => {
                            const val = parseInt(event.target.value, 10)
                            if (!isNaN(val) && val > 0) updateTask(index, { dueInDays: val })
                          }}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          )
        })}
      </div>

      {availableToAdd.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" type="button">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Automação
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableToAdd.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => addAutomation(option.value)}>
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {!hasItems && (
        <div className="flex items-center justify-center rounded-lg border border-dashed py-6">
          <p className="text-xs text-muted-foreground">Nenhuma automação configurada.</p>
        </div>
      )}
    </div>
  )
}

export default StepAutomationsSection
