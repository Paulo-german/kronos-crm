'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  BellOff,
  CalendarDays,
  ChevronDown,
  Clock,
  MapPin,
  Phone,
  Plus,
  RotateCcw,
  Timer,
  User,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import { Card, CardContent } from '@/_components/ui/card'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/_components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/_components/ui/collapsible'
import { Switch } from '@/_components/ui/switch'
import { cn } from '@/_lib/utils'
import { DAYS_AHEAD_OPTIONS, DURATION_OPTIONS, GLOBAL_TOOL_OPTIONS, TOOL_OPTIONS } from './constants'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import HandOffConfig from './tool-config/hand-off-config'
import UpdateDealConfig from './tool-config/update-deal-config'
import CreateTaskConfig from './tool-config/create-task-config'

interface StepActionBuilderProps {
  value: StepAction[]
  onChange: (actions: StepAction[]) => void
  pipelineStages: PipelineStageOption[]
  excludeGlobalTools?: boolean
  agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'
  previousStepsLifecycleTriggers?: string[]
  currentLifecycleTrigger?: string | null
  onLifecycleTriggerChange?: (value: string) => void
}

const TRIGGER_PLACEHOLDERS: Record<string, string> = {
  move_deal: 'Ex: Ao concluir esta etapa',
  update_contact: 'Ex: Ao coletar dados do contato',
  update_deal: 'Ex: Ao coletar informações do negócio',
  create_task: 'Ex: Ao identificar necessidade de follow-up',
  list_availability: 'Ex: Quando o lead quiser agendar uma reunião',
  create_event: 'Ex: Quando o lead confirmar o horário do evento',
  hand_off_to_human: 'Ex: Se necessário atendimento humano',
  create_appointment: 'Ex: Quando o cliente confirmar o serviço',
}

const buildDefaultAction = (type: string): StepAction => {
  switch (type) {
    case 'move_deal':
      return { type: 'move_deal', trigger: '', targetStage: '' }
    case 'create_task':
      return { type: 'create_task', trigger: '', title: '' }
    case 'update_contact':
      return { type: 'update_contact', trigger: '' }
    case 'update_deal':
      return { type: 'update_deal', trigger: '', allowedFields: [], allowedStatuses: [] }
    case 'list_availability':
      return {
        type: 'list_availability',
        trigger: '',
        daysAhead: 5,
        slotDuration: 60,
        startTime: '08:00',
        endTime: '18:00',
        provider: 'internal',
      }
    case 'create_event':
      return {
        type: 'create_event',
        trigger: '',
        titleInstructions: '',
        duration: 60,
        startTime: '08:00',
        endTime: '18:00',
        allowReschedule: false,
        provider: 'internal',
      }
    case 'hand_off_to_human':
      return { type: 'hand_off_to_human', trigger: '', notifyTarget: 'none' as const }
    case 'create_appointment':
      return { type: 'create_appointment', trigger: '', bookingCreateDeal: true }
    default:
      return { type: 'update_contact', trigger: '' }
  }
}

interface ActionSummary {
  trigger: string | null
  config: React.ReactNode
}

const DEAL_FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  value: 'Valor',
  priority: 'Prioridade',
  expectedCloseDate: 'Prev. fechamento',
  notes: 'Notas',
}

const InfoPiece = ({
  icon: Icon,
  text,
}: {
  icon: React.ElementType
  text: string
}) => (
  <span className="inline-flex items-center gap-0.5">
    <Icon className="h-3 w-3 shrink-0" />
    {text}
  </span>
)

const Dot = () => <span className="text-muted-foreground/40">·</span>

const getActionSummary = (action: StepAction, pipelineStages: PipelineStageOption[], agentMode?: 'PRODUCT' | 'SERVICE' | 'HYBRID'): ActionSummary => {
  const trigger = action.trigger || null

  switch (action.type) {
    case 'move_deal': {
      const stage = pipelineStages.find((stage) => stage.stageId === action.targetStage)
      return {
        trigger,
        config: stage
          ? <InfoPiece icon={MapPin} text={stage.stageName} />
          : 'Etapa não definida',
      }
    }
    case 'update_contact':
      return { trigger, config: 'Sem configuração adicional' }
    case 'update_deal': {
      const fields = action.allowedFields ?? []
      if (fields.length === 0) return { trigger, config: 'Nenhum campo selecionado' }
      return { trigger, config: fields.map((field) => DEAL_FIELD_LABELS[field] ?? field).join(', ') }
    }
    case 'create_task': {
      if (!action.title) return { trigger, config: 'Título não definido' }
      return {
        trigger,
        config: (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span>&ldquo;{action.title}&rdquo;</span>
            {action.dueDaysOffset && (
              <>
                <Dot />
                <InfoPiece icon={Clock} text={`${action.dueDaysOffset} dias`} />
              </>
            )}
          </span>
        ),
      }
    }
    case 'list_availability':
      if (agentMode === 'SERVICE') {
        return {
          trigger,
          config: <InfoPiece icon={CalendarDays} text={`${action.daysAhead} dias`} />,
        }
      }
      return {
        trigger,
        config: (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <InfoPiece icon={Clock} text={`${action.startTime}–${action.endTime}`} />
            <Dot />
            <InfoPiece icon={Timer} text={`${action.slotDuration} min`} />
            <Dot />
            <InfoPiece icon={CalendarDays} text={`${action.daysAhead} dias`} />
          </span>
        ),
      }
    case 'create_event':
      return {
        trigger,
        config: (
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <InfoPiece icon={Timer} text={`${action.duration} min`} />
            <Dot />
            <InfoPiece icon={Clock} text={`${action.startTime}–${action.endTime}`} />
            {action.allowReschedule && (
              <>
                <Dot />
                <InfoPiece icon={RotateCcw} text="reagendamento" />
              </>
            )}
          </span>
        ),
      }
    case 'hand_off_to_human': {
      if (action.notifyTarget === 'specific_number') {
        return {
          trigger,
          config: <InfoPiece icon={Phone} text={action.specificPhone ?? 'Número não definido'} />,
        }
      }
      if (action.notifyTarget === 'deal_assignee') {
        return { trigger, config: <InfoPiece icon={User} text="Responsável pelo negócio" /> }
      }
      return { trigger, config: <InfoPiece icon={BellOff} text="Sem notificação" /> }
    }
    case 'create_appointment': {
      const parts = []
      if (action.startTime && action.endTime) {
        parts.push(<InfoPiece key="time" icon={Clock} text={`${action.startTime}–${action.endTime}`} />)
      }
      return {
        trigger,
        config: parts.length > 0 ? <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">{parts}</span> : 'Sem janela de horário definida',
      }
    }
  }
}

const StepActionBuilder = ({
  value,
  onChange,
  pipelineStages,
  excludeGlobalTools = false,
  agentMode = 'PRODUCT',
  previousStepsLifecycleTriggers,
  currentLifecycleTrigger,
  onLifecycleTriggerChange,
}: StepActionBuilderProps) => {
  // Indexado por id de instância (não por type) para permitir abrir/fechar
  // cards individuais quando há múltiplas instâncias do mesmo type.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  // Backfill defensivo: itens vindos do servidor sem id recebem um id local
  // para uso como React key. Não chamamos onChange — o backend normalizará no
  // próximo save. O useMemo garante ids estáveis entre re-renders.
  const valueWithIds = useMemo(
    () =>
      value.map((action) =>
        action.id ? action : { ...action, id: crypto.randomUUID() },
      ),
    [value],
  )

  const toggle = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const addAction = (type: string) => {
    const newAction = { id: crypto.randomUUID(), ...buildDefaultAction(type) }
    onChange([...value, newAction])
    setExpandedIds((prev) => new Set([...prev, newAction.id!]))

    if (type === 'create_appointment' && onLifecycleTriggerChange) {
      const hasPriorOpportunity = (previousStepsLifecycleTriggers ?? []).some(
        (trigger) => trigger === 'OPPORTUNITY',
      )
      if (!hasPriorOpportunity && currentLifecycleTrigger !== 'OPPORTUNITY') {
        onLifecycleTriggerChange('OPPORTUNITY')
        toast.info(
          'O gatilho de ciclo de vida "Oportunidade" foi ativado automaticamente neste passo, pois nenhum passo anterior já o definia.',
        )
      }
    }
  }

  const removeAction = (id: string) => {
    onChange(value.filter((action) => action.id !== id))
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const updateAction = (
    id: string,
    updates: Record<string, unknown>,
  ) => {
    onChange(
      value.map((action) =>
        action.id === id
          ? ({ ...action, ...updates } as StepAction)
          : action,
      ),
    )
  }

  const PRODUCT_ONLY = new Set(['create_event'])
  const SERVICE_ONLY = new Set(['create_appointment'])
  const isIncompatibleWithMode = (type: string): boolean => {
    if (agentMode === 'HYBRID') return false
    if (agentMode === 'PRODUCT') return SERVICE_ONLY.has(type)
    return PRODUCT_ONLY.has(type)
  }

  const globalToolTypes = new Set(GLOBAL_TOOL_OPTIONS.map((option) => option.value))

  // Permite adicionar qualquer tool sem restrição de duplicata (multi-instância).
  // Apenas tools globais são bloqueadas quando excludeGlobalTools está ativo.
  const availableToAdd = TOOL_OPTIONS.filter((tool) => {
    if (excludeGlobalTools && globalToolTypes.has(tool.value)) return false
    if (tool.value === 'create_appointment' && agentMode === 'PRODUCT') return false
    if (tool.value === 'create_event' && agentMode === 'SERVICE') return false
    return true
  })

  const groupedStages = pipelineStages.reduce<
    Record<string, { pipelineName: string; stages: PipelineStageOption[] }>
  >((acc, stage) => {
    if (!acc[stage.pipelineId]) {
      acc[stage.pipelineId] = {
        pipelineName: stage.pipelineName,
        stages: [],
      }
    }
    acc[stage.pipelineId].stages.push(stage)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Ações da Etapa</Label>
      <p className="text-xs text-muted-foreground">
        Configure as ações que o agente pode executar nesta etapa.
      </p>

      <div className="space-y-2">
        {valueWithIds.map((action, index) => {
          const toolOption = TOOL_OPTIONS.find((tool) => tool.value === action.type)
          const isGlobalTool = excludeGlobalTools && globalToolTypes.has(action.type)
          const isInactive = !isGlobalTool && isIncompatibleWithMode(action.type)
          const actionId = action.id!
          const isOpen = expandedIds.has(actionId)
          const summary = getActionSummary(action, pipelineStages, agentMode)

          // Badge de índice (#1, #2) aparece somente quando há mais de uma
          // instância do mesmo type, para distinguir visualmente as instâncias.
          const sameTypeCount = valueWithIds.filter((item) => item.type === action.type).length
          const instanceIndex = valueWithIds.slice(0, index).filter((item) => item.type === action.type).length
          const showInstanceBadge = sameTypeCount > 1

          return (
            <Collapsible
              key={actionId}
              open={isOpen && !isGlobalTool}
              onOpenChange={() => { if (!isGlobalTool) toggle(actionId) }}
            >
              <Card className={cn(
                isGlobalTool
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : isInactive
                  ? 'border-zinc-400/30 bg-muted/30'
                  : 'border-primary/30 bg-primary/5',
              )}>
                <CardContent className="p-0">
                  {/* Header compacto — sempre visível */}
                  <div className="flex items-center pr-2">
                    <CollapsibleTrigger asChild disabled={isGlobalTool}>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="block text-sm font-medium">
                              {toolOption?.label ?? action.type}
                            </span>
                            {showInstanceBadge && (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1.5 text-[10px] font-medium"
                              >
                                #{instanceIndex + 1}
                              </Badge>
                            )}
                            {isGlobalTool && (
                              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">
                                Global
                              </span>
                            )}
                            {isInactive && (
                              <span className="rounded-full border border-zinc-400/40 bg-zinc-400/10 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                Inativa
                              </span>
                            )}
                          </div>
                          {isGlobalTool ? (
                            <span className="block text-xs text-amber-600/70">
                              Configurada na aba Ferramentas Globais
                            </span>
                          ) : isInactive ? (
                            <span className="block text-xs text-muted-foreground/50">
                              Inativa neste modo de operação
                            </span>
                          ) : (
                            !isOpen && (
                              <span className="flex flex-col gap-0.5 text-xs text-muted-foreground/70">
                                {summary.trigger && (
                                  <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                                    <Zap className="h-3 w-3 shrink-0" />
                                    <span className="truncate">{summary.trigger}</span>
                                  </span>
                                )}
                                <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                  {summary.config}
                                </span>
                              </span>
                            )
                          )}
                        </div>
                        {!isGlobalTool && (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                              isOpen && 'rotate-180',
                            )}
                          />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAction(actionId)}
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Conteúdo expandido */}
                  <CollapsibleContent>
                    <div className="space-y-3 border-t px-4 pb-4 pt-4">
                      {toolOption?.description && (
                        <p className="text-xs text-muted-foreground">
                          {toolOption.description}
                        </p>
                      )}
                      {/* Campo trigger — comum a todos */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Quando executar</Label>
                        <Input
                          placeholder={TRIGGER_PLACEHOLDERS[action.type]}
                          value={action.trigger}
                          onChange={(event) =>
                            updateAction(actionId, {
                              trigger: event.target.value,
                            })
                          }
                        />
                      </div>

                      {/* move_deal: select de stage */}
                      {action.type === 'move_deal' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Etapa de destino *</Label>
                          <Select
                            value={action.targetStage}
                            onValueChange={(stageId) =>
                              updateAction(actionId, {
                                targetStage: stageId,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione a etapa do pipeline" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(groupedStages).map(
                                ([pipelineId, group]) => (
                                  <div key={pipelineId}>
                                    {Object.keys(groupedStages).length > 1 && (
                                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {group.pipelineName}
                                      </div>
                                    )}
                                    {group.stages.map((stage) => (
                                      <SelectItem
                                        key={stage.stageId}
                                        value={stage.stageId}
                                      >
                                        {Object.keys(groupedStages).length > 1
                                          ? `${group.pipelineName} → ${stage.stageName}`
                                          : stage.stageName}
                                      </SelectItem>
                                    ))}
                                  </div>
                                ),
                              )}
                              {pipelineStages.length === 0 && (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                  Nenhum pipeline vinculado ao agente
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* create_task: título + vencimento */}
                      {action.type === 'create_task' && (
                        <CreateTaskConfig
                          title={action.title}
                          dueDaysOffset={action.dueDaysOffset}
                          onTitleChange={(val) => updateAction(actionId, { title: val })}
                          onDueDaysOffsetChange={(val) => updateAction(actionId, { dueDaysOffset: val })}
                        />
                      )}

                      {/* update_deal: campos permitidos + status */}
                      {action.type === 'update_deal' && (
                        <UpdateDealConfig
                          actionType={action.type}
                          allowedFields={action.allowedFields ?? []}
                          fixedPriority={action.fixedPriority}
                          notesTemplate={action.notesTemplate}
                          allowedStatuses={action.allowedStatuses ?? []}
                          onAllowedFieldsChange={(fields, extra) =>
                            updateAction(actionId, { allowedFields: fields, ...extra })
                          }
                          onFixedPriorityChange={(val) =>
                            updateAction(actionId, { fixedPriority: val as 'low' | 'medium' | 'high' | 'urgent' | undefined })
                          }
                          onNotesTemplateChange={(val) =>
                            updateAction(actionId, { notesTemplate: val })
                          }
                          onAllowedStatusesChange={(statuses) =>
                            updateAction(actionId, { allowedStatuses: statuses })
                          }
                        />
                      )}

                      {/* list_availability: em SERVICE os campos de slot/janela vêm do serviço/profissional */}
                      {action.type === 'list_availability' && agentMode === 'SERVICE' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Dias para frente *</Label>
                          <p className="text-[11px] text-muted-foreground">
                            Janela de horário e duração do slot são definidas pelo serviço e profissional cadastrados.
                          </p>
                          <Select
                            value={String(action.daysAhead)}
                            onValueChange={(val) =>
                              updateAction(actionId, { daysAhead: parseInt(val, 10) })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_AHEAD_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={String(option.value)}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {action.type === 'list_availability' && agentMode !== 'SERVICE' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Dias para frente *</Label>
                            <Select
                              value={String(action.daysAhead)}
                              onValueChange={(val) =>
                                updateAction(actionId, { daysAhead: parseInt(val, 10) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {DAYS_AHEAD_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={String(option.value)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Duração do slot *</Label>
                            <Select
                              value={String(action.slotDuration)}
                              onValueChange={(val) =>
                                updateAction(actionId, { slotDuration: val })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={String(option.value)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Horário de início *</Label>
                            <Input
                              placeholder="07:00"
                              pattern="\d{2}:\d{2}"
                              value={action.startTime}
                              onChange={(event) =>
                                updateAction(actionId, {
                                  startTime: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Horário de fim *</Label>
                            <Input
                              placeholder="23:00"
                              pattern="\d{2}:\d{2}"
                              value={action.endTime}
                              onChange={(event) =>
                                updateAction(actionId, {
                                  endTime: event.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}

                      {/* create_event: instruções de título + duração + janela de horário + reagendamento */}
                      {action.type === 'create_event' && (
                        <>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Instruções para o título *</Label>
                            <Textarea
                              placeholder="Ex: Use o nome do contato + tipo de reunião"
                              value={action.titleInstructions}
                              onChange={(event) =>
                                updateAction(actionId, {
                                  titleInstructions: event.target.value,
                                })
                              }
                              rows={2}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Duração do evento *</Label>
                            <Select
                              value={String(action.duration)}
                              onValueChange={(val) =>
                                updateAction(actionId, { duration: val })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {DURATION_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={String(option.value)}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Janela de tempo */}
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Janela de tempo para agendamentos</Label>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                A IA só poderá agendar dentro deste horário
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Início</Label>
                                <Input
                                  placeholder="08:00"
                                  pattern="\d{2}:\d{2}"
                                  value={action.startTime}
                                  onChange={(event) =>
                                    updateAction(actionId, {
                                      startTime: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Fim</Label>
                                <Input
                                  placeholder="18:00"
                                  pattern="\d{2}:\d{2}"
                                  value={action.endTime}
                                  onChange={(event) =>
                                    updateAction(actionId, {
                                      endTime: event.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Switch de reagendamento */}
                          <div className="space-y-2 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-xs">Permitir reagendamento</Label>
                                <p className="text-[11px] text-muted-foreground">
                                  Habilita a IA a reagendar eventos existentes quando solicitado
                                </p>
                              </div>
                              <Switch
                                checked={action.allowReschedule}
                                onCheckedChange={(checked) =>
                                  updateAction(actionId, {
                                    allowReschedule: checked,
                                    ...(!checked ? { rescheduleInstructions: undefined } : {}),
                                  })
                                }
                              />
                            </div>
                            {action.allowReschedule && (
                              <div className="space-y-1.5">
                                <Label className="text-xs">
                                  Instruções de reagendamento (opcional)
                                </Label>
                                <Input
                                  placeholder="Ex: Limite a 2 reagendamentos por evento"
                                  value={action.rescheduleInstructions ?? ''}
                                  onChange={(event) =>
                                    updateAction(actionId, {
                                      rescheduleInstructions:
                                        event.target.value || undefined,
                                    })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* create_appointment: janela de horário (duração vem do serviço no DB) */}
                      {action.type === 'create_appointment' && (
                        <>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs">Janela de tempo para agendamentos</Label>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                A IA só poderá agendar dentro deste horário
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Início</Label>
                                <Input
                                  placeholder="08:00"
                                  pattern="\d{2}:\d{2}"
                                  value={action.startTime ?? ''}
                                  onChange={(event) =>
                                    updateAction(actionId, {
                                      startTime: event.target.value || undefined,
                                    })
                                  }
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Fim</Label>
                                <Input
                                  placeholder="18:00"
                                  pattern="\d{2}:\d{2}"
                                  value={action.endTime ?? ''}
                                  onChange={(event) =>
                                    updateAction(actionId, {
                                      endTime: event.target.value || undefined,
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* Toggle de criação de negociação quando ainda não existe deal aberto na conversa */}
                          <div className="space-y-2 border-t pt-3">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <Label className="text-xs">Criar negociação quando não houver uma aberta</Label>
                                <p className="text-[11px] text-muted-foreground">
                                  Se a conversa já tiver uma negociação aberta, o agendamento será vinculado
                                  a ela automaticamente. Este controle só decide se uma negociação nova é
                                  criada quando ainda não existe nenhuma.
                                </p>
                              </div>
                              <Switch
                                checked={action.bookingCreateDeal ?? true}
                                onCheckedChange={(checked) =>
                                  updateAction(actionId, { bookingCreateDeal: checked })
                                }
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* hand_off_to_human: notificação ao atendente via WhatsApp */}
                      {action.type === 'hand_off_to_human' && (
                        <HandOffConfig
                          notifyTarget={action.notifyTarget}
                          specificPhone={action.specificPhone}
                          notificationMessage={action.notificationMessage}
                          onNotifyTargetChange={(val) =>
                            updateAction(actionId, {
                              notifyTarget: val,
                              ...(val === 'none'
                                ? { specificPhone: undefined, notificationMessage: undefined }
                                : {}),
                              ...(val === 'deal_assignee'
                                ? { specificPhone: undefined }
                                : {}),
                            })
                          }
                          onSpecificPhoneChange={(val) =>
                            updateAction(actionId, { specificPhone: val })
                          }
                          onNotificationMessageChange={(val) =>
                            updateAction(actionId, { notificationMessage: val })
                          }
                        />
                      )}
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
              Adicionar Ação
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {availableToAdd.map((tool) => (
              <DropdownMenuItem key={tool.value} onClick={() => addAction(tool.value)}>
                {tool.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

export default StepActionBuilder
