'use client'

import { Card, CardContent } from '@/_components/ui/card'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { TOOL_OPTIONS } from './constants'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

interface StepActionBuilderProps {
  value: StepAction[]
  onChange: (actions: StepAction[]) => void
  pipelineStages: PipelineStageOption[]
}

const TRIGGER_PLACEHOLDERS: Record<string, string> = {
  move_deal: 'Ex: Ao concluir esta etapa',
  update_contact: 'Ex: Ao coletar dados do contato',
  update_deal: 'Ex: Ao coletar informações do negócio',
  create_task: 'Ex: Ao identificar necessidade de follow-up',
  create_appointment: 'Ex: Quando o lead confirmar a visita',
  search_knowledge: 'Ex: Se precisar de informações específicas',
  hand_off_to_human: 'Ex: Se necessário atendimento humano',
}

const buildDefaultAction = (type: string): StepAction => {
  switch (type) {
    case 'move_deal':
      return { type: 'move_deal', trigger: '', targetStage: '' }
    case 'create_task':
      return { type: 'create_task', trigger: '', title: '' }
    case 'create_appointment':
      return { type: 'create_appointment', trigger: '', title: '' }
    case 'update_contact':
      return { type: 'update_contact', trigger: '' }
    case 'update_deal':
      return { type: 'update_deal', trigger: '' }
    case 'search_knowledge':
      return { type: 'search_knowledge', trigger: '' }
    case 'hand_off_to_human':
      return { type: 'hand_off_to_human', trigger: '' }
    default:
      return { type: 'update_contact', trigger: '' }
  }
}

const StepActionBuilder = ({
  value,
  onChange,
  pipelineStages,
}: StepActionBuilderProps) => {
  const findAction = (type: string) =>
    value.find((action) => action.type === type)

  const handleToggle = (type: string, enabled: boolean) => {
    if (enabled) {
      onChange([...value, buildDefaultAction(type)])
    } else {
      onChange(value.filter((action) => action.type !== type))
    }
  }

  const updateAction = (
    type: string,
    updates: Record<string, unknown>,
  ) => {
    onChange(
      value.map((action) =>
        action.type === type
          ? ({ ...action, ...updates } as StepAction)
          : action,
      ),
    )
  }

  // Agrupar stages por pipeline para o select
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
        {TOOL_OPTIONS.map((tool) => {
          const action = findAction(tool.value)
          const isEnabled = !!action

          return (
            <Card
              key={tool.value}
              className={`transition-colors ${isEnabled ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium cursor-pointer">
                      {tool.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) =>
                      handleToggle(tool.value, checked)
                    }
                  />
                </div>

                {isEnabled && action && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    {/* Campo trigger — comum a todos */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Quando executar</Label>
                      <Input
                        placeholder={TRIGGER_PLACEHOLDERS[tool.value]}
                        value={action.trigger}
                        onChange={(event) =>
                          updateAction(tool.value, {
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
                            updateAction('move_deal', {
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
                                      value={stage.stageName}
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
                      <>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Título da tarefa *</Label>
                          <Input
                            placeholder="Ex: Follow-up com o lead"
                            value={action.title}
                            onChange={(event) =>
                              updateAction('create_task', {
                                title: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">
                            Vencimento em dias (opcional)
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Ex: 3"
                            value={action.dueDaysOffset ?? ''}
                            onChange={(event) => {
                              const val = event.target.value
                              updateAction('create_task', {
                                dueDaysOffset: val
                                  ? parseInt(val, 10)
                                  : undefined,
                              })
                            }}
                          />
                        </div>
                      </>
                    )}

                    {/* create_appointment: título */}
                    {action.type === 'create_appointment' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">
                          Título do compromisso *
                        </Label>
                        <Input
                          placeholder="Ex: Reunião de demonstração"
                          value={action.title}
                          onChange={(event) =>
                            updateAction('create_appointment', {
                              title: event.target.value,
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default StepActionBuilder
