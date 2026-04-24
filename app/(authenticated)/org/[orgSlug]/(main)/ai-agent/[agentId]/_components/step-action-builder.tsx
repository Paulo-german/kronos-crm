'use client'

import { Plus, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Checkbox } from '@/_components/ui/checkbox'
import { Badge } from '@/_components/ui/badge'
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
import { Switch } from '@/_components/ui/switch'
import { DAYS_AHEAD_OPTIONS, DURATION_OPTIONS, TOOL_OPTIONS } from './constants'
import type { StepAction } from '@/_actions/agent/shared/step-action-schema'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'

interface StepActionBuilderProps {
  value: StepAction[]
  onChange: (actions: StepAction[]) => void
  pipelineStages: PipelineStageOption[]
}

const NOTIFY_TARGET_OPTIONS = [
  { value: 'none', label: 'Sem notificação' },
  { value: 'specific_number', label: 'Número específico' },
  { value: 'deal_assignee', label: 'Responsável pelo negócio' },
] as const

const TRIGGER_PLACEHOLDERS: Record<string, string> = {
  move_deal: 'Ex: Ao concluir esta etapa',
  update_contact: 'Ex: Ao coletar dados do contato',
  update_deal: 'Ex: Ao coletar informações do negócio',
  create_task: 'Ex: Ao identificar necessidade de follow-up',
  list_availability: 'Ex: Quando o lead quiser agendar uma reunião',
  create_event: 'Ex: Quando o lead confirmar o horário do evento',
  hand_off_to_human: 'Ex: Se necessário atendimento humano',
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
    default:
      return { type: 'update_contact', trigger: '' }
  }
}

const StepActionBuilder = ({
  value,
  onChange,
  pipelineStages,
}: StepActionBuilderProps) => {
  const addAction = (type: string) => {
    onChange([...value, buildDefaultAction(type)])
  }

  const removeAction = (type: string) => {
    onChange(value.filter((action) => action.type !== type))
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

  const availableToAdd = TOOL_OPTIONS.filter(
    (tool) => !value.some((action) => action.type === tool.value),
  )

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
        {value.map((action) => {
          const toolOption = TOOL_OPTIONS.find((t) => t.value === action.type)

          return (
            <Card
              key={action.type}
              className="border-primary/30 bg-primary/5"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">
                      {toolOption?.label ?? action.type}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {toolOption?.description}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeAction(action.type)}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 space-y-3 border-t pt-4">
                  {/* Campo trigger — comum a todos */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quando executar</Label>
                    <Input
                      placeholder={TRIGGER_PLACEHOLDERS[action.type]}
                      value={action.trigger}
                      onChange={(event) =>
                        updateAction(action.type, {
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

                  {/* update_deal: campos permitidos + status */}
                  {action.type === 'update_deal' && (
                    <>
                      {/* Bloco A — Campos permitidos */}
                      <div className="space-y-2">
                        <Label className="text-xs">Campos que o agente pode atualizar</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {(
                            [
                              { id: 'title', label: 'Título' },
                              { id: 'value', label: 'Valor (R$)' },
                              { id: 'priority', label: 'Prioridade' },
                              { id: 'expectedCloseDate', label: 'Previsão de fechamento' },
                              { id: 'notes', label: 'Notas' },
                            ] as const
                          ).map((field) => {
                            const isChecked = (action.allowedFields ?? []).includes(field.id)
                            return (
                              <div key={field.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${action.type}-${field.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const current = action.allowedFields ?? []
                                    updateAction('update_deal', {
                                      allowedFields: checked
                                        ? [...current, field.id]
                                        : current.filter((f) => f !== field.id),
                                      ...(field.id === 'priority' && !checked
                                        ? { fixedPriority: undefined }
                                        : {}),
                                      ...(field.id === 'notes' && !checked
                                        ? { notesTemplate: undefined }
                                        : {}),
                                    })
                                  }}
                                />
                                <Label
                                  htmlFor={`${action.type}-${field.id}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {field.label}
                                </Label>
                              </div>
                            )
                          })}
                        </div>

                        {/* Prioridade fixa (condicional) */}
                        {(action.allowedFields ?? []).includes('priority') && (
                          <div className="space-y-1.5 pl-1">
                            <Label className="text-xs text-muted-foreground">
                              Prioridade fixa (opcional)
                            </Label>
                            <Select
                              value={action.fixedPriority ?? ''}
                              onValueChange={(val) =>
                                updateAction('update_deal', {
                                  fixedPriority: val || undefined,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Deixar o agente decidir" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Instruções para notas (condicional) */}
                        {(action.allowedFields ?? []).includes('notes') && (
                          <div className="space-y-1.5 pl-1">
                            <Label className="text-xs text-muted-foreground">
                              Instruções para as notas (opcional)
                            </Label>
                            <Textarea
                              placeholder="Ex: Registre o decisor, orçamento disponível e prazo"
                              value={action.notesTemplate ?? ''}
                              onChange={(event) =>
                                updateAction('update_deal', {
                                  notesTemplate: event.target.value || undefined,
                                })
                              }
                              rows={2}
                            />
                          </div>
                        )}
                      </div>

                      {/* Bloco B — Status do negócio */}
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Status do negócio</Label>
                          <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">
                            Ação irreversível
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {(
                            [
                              { id: 'WON', label: 'Pode marcar como Ganho (WON)' },
                              { id: 'LOST', label: 'Pode marcar como Perdido (LOST)' },
                            ] as const
                          ).map((status) => {
                            const isChecked = (action.allowedStatuses ?? []).includes(status.id)
                            return (
                              <div key={status.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`${action.type}-${status.id}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => {
                                    const current = action.allowedStatuses ?? []
                                    updateAction('update_deal', {
                                      allowedStatuses: checked
                                        ? [...current, status.id]
                                        : current.filter((s) => s !== status.id),
                                    })
                                  }}
                                />
                                <Label
                                  htmlFor={`${action.type}-${status.id}`}
                                  className="text-xs font-normal cursor-pointer"
                                >
                                  {status.label}
                                </Label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {/* list_availability: janela de busca de disponibilidade */}
                  {action.type === 'list_availability' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Dias para frente *</Label>
                        <Select
                          value={String(action.daysAhead)}
                          onValueChange={(val) =>
                            updateAction('list_availability', { daysAhead: parseInt(val, 10) })
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
                            updateAction('list_availability', { slotDuration: val })
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
                            updateAction('list_availability', {
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
                            updateAction('list_availability', {
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
                            updateAction('create_event', {
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
                            updateAction('create_event', { duration: val })
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
                                updateAction('create_event', {
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
                                updateAction('create_event', {
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
                              updateAction('create_event', {
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
                                updateAction('create_event', {
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

                  {/* hand_off_to_human: notificação ao atendente via WhatsApp */}
                  {action.type === 'hand_off_to_human' && (
                    <div className="space-y-3 border-t pt-3">
                      <Label className="text-xs">Notificação ao atendente</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        O agente decide em tempo real se deve transferir (pausar a IA) ou apenas notificar (IA continua). A configuração abaixo define como o responsável será notificado em ambos os casos.
                      </p>

                      {/* Select de modo de notificação */}
                      <div className="space-y-1.5">
                        <Select
                          value={action.notifyTarget}
                          onValueChange={(val) =>
                            updateAction('hand_off_to_human', {
                              notifyTarget: val,
                              ...(val === 'none'
                                ? { specificPhone: undefined, notificationMessage: undefined }
                                : {}),
                              ...(val === 'deal_assignee'
                                ? { specificPhone: undefined }
                                : {}),
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de notificação" />
                          </SelectTrigger>
                          <SelectContent>
                            {NOTIFY_TARGET_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* specific_number: input de telefone */}
                      {action.notifyTarget === 'specific_number' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Número de WhatsApp *</Label>
                          <Input
                            placeholder="5511999999999"
                            value={action.specificPhone ?? ''}
                            onChange={(event) =>
                              updateAction('hand_off_to_human', {
                                specificPhone: event.target.value || undefined,
                              })
                            }
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Informe o número com DDD e código do país
                          </p>
                        </div>
                      )}

                      {/* deal_assignee: texto informativo */}
                      {action.notifyTarget === 'deal_assignee' && (
                        <p className="text-[11px] text-muted-foreground">
                          O responsável pelo negócio será notificado no WhatsApp cadastrado no
                          perfil dele. Se não houver telefone, a notificação será ignorada
                          silenciosamente.
                        </p>
                      )}

                      {/* specific_number OU deal_assignee: mensagem personalizada */}
                      {(action.notifyTarget === 'specific_number' ||
                        action.notifyTarget === 'deal_assignee') && (
                        <div className="space-y-1.5">
                          <Label className="text-xs">Mensagem personalizada (opcional)</Label>
                          <Textarea
                            placeholder="Ex: Conversa transferida. Por favor, assuma o atendimento."
                            value={action.notificationMessage ?? ''}
                            onChange={(event) =>
                              updateAction('hand_off_to_human', {
                                notificationMessage: event.target.value || undefined,
                              })
                            }
                            rows={2}
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Se vazio, será enviada uma mensagem padrão com o nome do contato e motivo
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
