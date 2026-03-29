'use client'

import React from 'react'
import { useFormContext } from 'react-hook-form'
import { AutomationTrigger } from '@prisma/client'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Label } from '@/_components/ui/label'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { TRIGGER_LABELS } from './automation-labels'
import {
  Plus,
  ArrowRightLeft,
  Clock,
  Timer,
  Activity,
  RefreshCw,
} from 'lucide-react'
import type { AutomationFormValues } from './wizard-form-types'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import { Button } from '@/_components/ui/button'
import { Separator } from '@/_components/ui/separator'

interface WizardStepTriggerProps {
  pipelines: OrgPipelineDto[]
  stageOptions: PipelineStageOption[]
  showConfigErrors?: boolean
}

const TIME_THRESHOLD_OPTIONS = [
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '2 horas', value: 120 },
  { label: '4 horas', value: 240 },
  { label: '8 horas', value: 480 },
  { label: '1 dia', value: 1440 },
  { label: '2 dias', value: 2880 },
  { label: '3 dias', value: 4320 },
  { label: '7 dias', value: 10080 },
]

const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Nota', value: 'note' },
  { label: 'Ligação', value: 'call' },
  { label: 'E-mail', value: 'email' },
  { label: 'Reunião', value: 'meeting' },
  { label: 'Tarefa', value: 'task' },
]

const DEAL_STATUS_OPTIONS = [
  { label: 'Aberta', value: 'OPEN' },
  { label: 'Em andamento', value: 'IN_PROGRESS' },
  { label: 'Ganha', value: 'WON' },
  { label: 'Perdida', value: 'LOST' },
  { label: 'Pausada', value: 'PAUSED' },
]

const EVENT_TRIGGERS = [
  AutomationTrigger.DEAL_CREATED,
  AutomationTrigger.DEAL_MOVED,
  AutomationTrigger.ACTIVITY_CREATED,
  AutomationTrigger.DEAL_STATUS_CHANGED,
]

const TIME_TRIGGERS = [
  AutomationTrigger.DEAL_STALE,
  AutomationTrigger.DEAL_IDLE_IN_STAGE,
]

const TRIGGER_ICONS: Record<AutomationTrigger, React.ElementType> = {
  DEAL_CREATED: Plus,
  DEAL_MOVED: ArrowRightLeft,
  DEAL_STALE: Clock,
  DEAL_IDLE_IN_STAGE: Timer,
  ACTIVITY_CREATED: Activity,
  DEAL_STATUS_CHANGED: RefreshCw,
}

export function WizardStepTrigger({ pipelines, stageOptions, showConfigErrors = false }: WizardStepTriggerProps) {
  const form = useFormContext<AutomationFormValues>()
  const triggerType = form.watch('triggerType')
  const triggerConfig = form.watch('triggerConfig') as Record<string, unknown>

  const handleTriggerChange = (value: AutomationTrigger) => {
    form.setValue('triggerType', value)
    form.setValue('triggerConfig', {})
    // Limpa os erros de config ao trocar de gatilho
    form.clearErrors('triggerConfig')
  }

  const setTriggerConfigValue = (key: string, value: unknown) => {
    const current = form.getValues('triggerConfig')
    form.setValue('triggerConfig', { ...current, [key]: value })
  }

  const getConfigString = (key: string): string => {
    const val = triggerConfig[key]
    return typeof val === 'string' ? val : ''
  }

  const getConfigNumber = (key: string): string => {
    const val = triggerConfig[key]
    return typeof val === 'number' ? String(val) : ''
  }

  const getConfigArray = (key: string): string[] => {
    const val = triggerConfig[key]
    return Array.isArray(val) ? (val as string[]) : []
  }

  const handleMultiToggle = (configKey: string, value: string) => {
    const currentValues = getConfigArray(configKey)
    const newValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value]
    setTriggerConfigValue(configKey, newValues)
  }

  // Filtra stages pelo pipelineId do triggerConfig quando houver seleção
  const selectedPipelineId = getConfigString('pipelineId')
  const filteredStageOptions = selectedPipelineId
    ? stageOptions.filter((stage) => stage.pipelineId === selectedPipelineId)
    : stageOptions

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Identificação</h3>
        <p className="text-sm text-muted-foreground">
          Dê um nome e descrição para identificar esta automação.
        </p>
      </div>

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome da automação *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Reatribuir deal parado por 2 dias" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva o que esta automação faz..."
                className="resize-none"
                rows={2}
                value={field.value ?? ''}
                onChange={field.onChange}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      <div className="space-y-1">
        <h3 className="text-base font-semibold">Gatilho (Quando)</h3>
        <p className="text-sm text-muted-foreground">
          Defina qual evento ou condição dispara esta automação.
        </p>
      </div>

      <FormField
        control={form.control}
        name="triggerType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de gatilho *</FormLabel>
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => handleTriggerChange(value as AutomationTrigger)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione quando a automação deve ser ativada" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Por evento</SelectLabel>
                  {EVENT_TRIGGERS.map((trigger) => {
                    const Icon = TRIGGER_ICONS[trigger]
                    return (
                      <SelectItem key={trigger} value={trigger}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {TRIGGER_LABELS[trigger]}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Por tempo</SelectLabel>
                  {TIME_TRIGGERS.map((trigger) => {
                    const Icon = TRIGGER_ICONS[trigger]
                    return (
                      <SelectItem key={trigger} value={trigger}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          {TRIGGER_LABELS[trigger]}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Configuração dinâmica — DEAL_CREATED */}
      {triggerType === AutomationTrigger.DEAL_CREATED && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Filtros opcionais (Negociação criada)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Pipeline (opcional)</Label>
              <Select
                value={getConfigString('pipelineId')}
                onValueChange={(val) => {
                  // Ao trocar de pipeline, limpa o stageId para evitar inconsistência
                  setTriggerConfigValue('pipelineId', val === 'any' ? undefined : val)
                  setTriggerConfigValue('stageId', undefined)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer pipeline</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estágio inicial (opcional)</Label>
              <Select
                value={getConfigString('stageId')}
                onValueChange={(val) =>
                  setTriggerConfigValue('stageId', val === 'any' ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer estágio" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer estágio</SelectItem>
                  {filteredStageOptions.map((stage) => (
                    <SelectItem key={stage.stageId} value={stage.stageId}>
                      {selectedPipelineId ? stage.stageName : `${stage.pipelineName} → ${stage.stageName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* DEAL_MOVED */}
      {triggerType === AutomationTrigger.DEAL_MOVED && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Filtros opcionais (Negociação movida)
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pipeline (opcional)</Label>
              <Select
                value={getConfigString('pipelineId')}
                onValueChange={(val) => {
                  // Ao trocar de pipeline, limpa os estágios de/para para evitar inconsistência
                  setTriggerConfigValue('pipelineId', val === 'any' ? undefined : val)
                  setTriggerConfigValue('fromStageId', undefined)
                  setTriggerConfigValue('toStageId', undefined)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer pipeline</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>De estágio (opcional)</Label>
                <Select
                  value={getConfigString('fromStageId')}
                  onValueChange={(val) =>
                    setTriggerConfigValue('fromStageId', val === 'any' ? undefined : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer estágio</SelectItem>
                    {filteredStageOptions.map((stage) => (
                      <SelectItem key={stage.stageId} value={stage.stageId}>
                        {selectedPipelineId ? stage.stageName : `${stage.pipelineName} → ${stage.stageName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Para estágio (opcional)</Label>
                <Select
                  value={getConfigString('toStageId')}
                  onValueChange={(val) =>
                    setTriggerConfigValue('toStageId', val === 'any' ? undefined : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Qualquer estágio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer estágio</SelectItem>
                    {filteredStageOptions.map((stage) => (
                      <SelectItem key={stage.stageId} value={stage.stageId}>
                        {selectedPipelineId ? stage.stageName : `${stage.pipelineName} → ${stage.stageName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEAL_STALE */}
      {triggerType === AutomationTrigger.DEAL_STALE && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4" data-error={showConfigErrors && !getConfigNumber('thresholdMinutes') ? 'true' : undefined}>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Negociação sem atividade)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tempo sem atividade *</Label>
              <Select
                value={getConfigNumber('thresholdMinutes')}
                onValueChange={(val) => {
                  setTriggerConfigValue('thresholdMinutes', Number(val))
                  form.clearErrors('triggerConfig')
                }}
              >
                <SelectTrigger className={showConfigErrors && !getConfigNumber('thresholdMinutes') ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_THRESHOLD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showConfigErrors && !getConfigNumber('thresholdMinutes') && (
                <p className="text-sm text-destructive">Selecione o período</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Pipeline (opcional)</Label>
              <Select
                value={getConfigString('pipelineId')}
                onValueChange={(val) =>
                  setTriggerConfigValue('pipelineId', val === 'any' ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer pipeline</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* DEAL_IDLE_IN_STAGE */}
      {triggerType === AutomationTrigger.DEAL_IDLE_IN_STAGE && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors && (!getConfigString('stageId') || !getConfigNumber('thresholdMinutes'))
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Parada em estágio)
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estágio a monitorar *</Label>
              <Select
                value={getConfigString('stageId')}
                onValueChange={(val) => {
                  setTriggerConfigValue('stageId', val)
                  form.clearErrors('triggerConfig')
                }}
              >
                <SelectTrigger className={showConfigErrors && !getConfigString('stageId') ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o estágio" />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage.stageId} value={stage.stageId}>
                      {stage.pipelineName} → {stage.stageName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showConfigErrors && !getConfigString('stageId') && (
                <p className="text-sm text-destructive">Selecione o estágio</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tempo parada *</Label>
              <Select
                value={getConfigNumber('thresholdMinutes')}
                onValueChange={(val) => {
                  setTriggerConfigValue('thresholdMinutes', Number(val))
                  form.clearErrors('triggerConfig')
                }}
              >
                <SelectTrigger className={showConfigErrors && !getConfigNumber('thresholdMinutes') ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_THRESHOLD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showConfigErrors && !getConfigNumber('thresholdMinutes') && (
                <p className="text-sm text-destructive">Selecione o período</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY_CREATED */}
      {triggerType === AutomationTrigger.ACTIVITY_CREATED && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Filtros opcionais (Atividade registrada)
          </p>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Tipos de atividade (deixe vazio para todas)</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {ACTIVITY_TYPE_OPTIONS.map((option) => {
                  const currentValues = getConfigArray('activityTypes')
                  const isSelected = currentValues.includes(option.value)
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleMultiToggle('activityTypes', option.value)}
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pipeline (opcional)</Label>
              <Select
                value={getConfigString('pipelineId')}
                onValueChange={(val) =>
                  setTriggerConfigValue('pipelineId', val === 'any' ? undefined : val)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Qualquer pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Qualquer pipeline</SelectItem>
                  {pipelines.map((pipeline) => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* DEAL_STATUS_CHANGED */}
      {triggerType === AutomationTrigger.DEAL_STATUS_CHANGED && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Status da negociação)
          </p>
          <div className="space-y-2">
            <Label>Status que disparam (deixe vazio para todos)</Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {DEAL_STATUS_OPTIONS.map((option) => {
                const currentValues = getConfigArray('statuses')
                const isSelected = currentValues.includes(option.value)
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleMultiToggle('statuses', option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
