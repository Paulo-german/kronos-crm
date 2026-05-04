'use client'

import { useFormContext } from 'react-hook-form'
import { AutomationAction } from '@prisma/client'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Textarea } from '@/_components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { ACTION_LABELS, REASSIGN_STRATEGY_LABELS, NOTIFY_TARGET_LABELS, PRIORITY_OPTIONS } from './automation-labels'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import { UserPlus, ArrowRight, XCircle, Bell, AlertTriangle } from 'lucide-react'
import React, { useRef } from 'react'
import type { AutomationFormValues } from './wizard-form-types'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'
import { Separator } from '@/_components/ui/separator'
import { Checkbox } from '@/_components/ui/checkbox'

const ACTION_ICONS: Record<AutomationAction, React.ElementType> = {
  REASSIGN_DEAL: UserPlus,
  MOVE_DEAL_TO_STAGE: ArrowRight,
  MARK_DEAL_LOST: XCircle,
  NOTIFY_USER: Bell,
  UPDATE_DEAL_PRIORITY: AlertTriangle,
}

const MESSAGE_VARIABLES = [
  { token: '{{deal.title}}',    label: 'Título' },
  { token: '{{deal.stage}}',    label: 'Estágio' },
  { token: '{{deal.assignee}}', label: 'Responsável' },
  { token: '{{deal.value}}',    label: 'Valor' },
] as const

interface WizardStepActionProps {
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
  showConfigErrors?: boolean
}

export function WizardStepAction({ stageOptions, members, lossReasons, showConfigErrors = false }: WizardStepActionProps) {
  const form = useFormContext<AutomationFormValues>()
  const actionType = form.watch('actionType')
  const actionConfig = form.watch('actionConfig') as Record<string, unknown>

  const handleActionChange = (value: AutomationAction) => {
    form.setValue('actionType', value)
    form.setValue('actionConfig', {})
    // Limpa os erros de config ao trocar de ação
    form.clearErrors('actionConfig')
  }

  const setActionConfigValue = (key: string, value: unknown) => {
    const current = form.getValues('actionConfig')
    form.setValue('actionConfig', { ...current, [key]: value })
  }

  const getConfigString = (key: string): string => {
    const val = actionConfig[key]
    return typeof val === 'string' ? val : ''
  }

  const getConfigBoolean = (key: string, defaultValue = false): boolean => {
    const val = actionConfig[key]
    return typeof val === 'boolean' ? val : defaultValue
  }

  const getConfigArray = (key: string): string[] => {
    const val = actionConfig[key]
    return Array.isArray(val) ? (val as string[]) : []
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const insertVariable = (token: string) => {
    const textarea = textareaRef.current
    const current = getConfigString('messageTemplate')
    const start = textarea?.selectionStart ?? current.length
    const end = textarea?.selectionEnd ?? current.length
    const next = current.slice(0, start) + token + current.slice(end)
    setActionConfigValue('messageTemplate', next)
    requestAnimationFrame(() => {
      if (!textarea) return
      textarea.focus()
      const cursor = start + token.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleMemberToggle = (userId: string) => {
    const currentIds = getConfigArray('targetUserIds')
    const newIds = currentIds.includes(userId)
      ? currentIds.filter((id) => id !== userId)
      : [...currentIds, userId]
    setActionConfigValue('targetUserIds', newIds)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold">Ação (Faça)</h3>
        <p className="text-sm text-muted-foreground">
          Defina o que acontecerá quando o gatilho for ativado e as condições forem atendidas.
        </p>
      </div>

      <FormField
        control={form.control}
        name="actionType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de ação *</FormLabel>
            <Select
              value={field.value ?? ''}
              onValueChange={(value) => handleActionChange(value as AutomationAction)}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação a ser executada" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {Object.values(AutomationAction).map((action) => {
                  const Icon = ACTION_ICONS[action]
                  return (
                    <SelectItem key={action} value={action}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {ACTION_LABELS[action]}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* REASSIGN_DEAL */}
      {actionType === AutomationAction.REASSIGN_DEAL && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors && (!getConfigString('strategy') || getConfigArray('targetUserIds').length === 0)
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Reatribuir negociação)
          </p>

          <div className="space-y-3">
            <Label>Estratégia de atribuição *</Label>
            <RadioGroup
              value={getConfigString('strategy')}
              onValueChange={(val) => {
                setActionConfigValue('strategy', val)
                form.clearErrors('actionConfig')
              }}
              className="space-y-2"
            >
              {Object.entries(REASSIGN_STRATEGY_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`strategy-${value}`} />
                  <Label htmlFor={`strategy-${value}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {showConfigErrors && !getConfigString('strategy') && (
              <p className="text-sm text-destructive">Selecione a estratégia</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Pool de membros *</Label>
            <p className="text-xs text-muted-foreground">
              Selecione os membros que poderão receber a negociação.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {members.map((member) => {
                const memberId = member.userId ?? member.id
                const isSelected = getConfigArray('targetUserIds').includes(memberId)
                return (
                  <div key={memberId} className="flex items-center gap-2">
                    <Checkbox
                      id={`member-${memberId}`}
                      checked={isSelected}
                      onCheckedChange={() => {
                        handleMemberToggle(memberId)
                        form.clearErrors('actionConfig')
                      }}
                    />
                    <Label
                      htmlFor={`member-${memberId}`}
                      className="cursor-pointer font-normal"
                    >
                      {member.user?.fullName ?? member.email}
                    </Label>
                  </div>
                )
              })}
            </div>
            {showConfigErrors && getConfigArray('targetUserIds').length === 0 && (
              <p className="text-sm text-destructive">Selecione ao menos um membro</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="excludeCurrentAssignee"
              checked={getConfigBoolean('excludeCurrentAssignee', true)}
              onCheckedChange={(checked) =>
                setActionConfigValue('excludeCurrentAssignee', checked)
              }
            />
            <Label htmlFor="excludeCurrentAssignee" className="cursor-pointer font-normal">
              Não atribuir para o responsável atual
            </Label>
          </div>
        </div>
      )}

      {/* MOVE_DEAL_TO_STAGE */}
      {actionType === AutomationAction.MOVE_DEAL_TO_STAGE && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={showConfigErrors && !getConfigString('targetStageId') ? 'true' : undefined}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Mover para estágio)
          </p>
          <div className="space-y-2">
            <Label>Estágio de destino *</Label>
            <Select
              value={getConfigString('targetStageId')}
              onValueChange={(val) => {
                setActionConfigValue('targetStageId', val)
                form.clearErrors('actionConfig')
              }}
            >
              <SelectTrigger className={showConfigErrors && !getConfigString('targetStageId') ? 'border-destructive' : ''}>
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
            {showConfigErrors && !getConfigString('targetStageId') && (
              <p className="text-sm text-destructive">Selecione o estágio</p>
            )}
          </div>
        </div>
      )}

      {/* MARK_DEAL_LOST */}
      {actionType === AutomationAction.MARK_DEAL_LOST && (
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Marcar como perdida)
          </p>
          <div className="space-y-2">
            <Label>Motivo de perda (opcional)</Label>
            <Select
              value={getConfigString('lossReasonId')}
              onValueChange={(val) =>
                setActionConfigValue('lossReasonId', val === 'none' ? undefined : val)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem motivo específico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem motivo específico</SelectItem>
                {lossReasons.map((reason) => (
                  <SelectItem key={reason.id} value={reason.id}>
                    {reason.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* NOTIFY_USER */}
      {actionType === AutomationAction.NOTIFY_USER && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors &&
            (!getConfigString('targetType') ||
              !getConfigString('messageTemplate') ||
              getConfigArray('channels').length === 0 ||
              (getConfigString('targetType') === 'specific_users' && getConfigArray('targetUserIds').length === 0))
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Enviar notificação)
          </p>

          <div className="space-y-3">
            <Label>Quem receberá a notificação *</Label>
            <RadioGroup
              value={getConfigString('targetType')}
              onValueChange={(val) => {
                setActionConfigValue('targetType', val)
                form.clearErrors('actionConfig')
              }}
              className="space-y-2"
            >
              {Object.entries(NOTIFY_TARGET_LABELS).map(([value, label]) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`notify-${value}`} />
                  <Label htmlFor={`notify-${value}`} className="cursor-pointer font-normal">
                    {label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {showConfigErrors && !getConfigString('targetType') && (
              <p className="text-sm text-destructive">Selecione quem notificar</p>
            )}
          </div>

          {getConfigString('targetType') === 'specific_users' && (
            <div className="space-y-2">
              <Label>Membros para notificar *</Label>
              <div className="grid grid-cols-1 gap-2">
                {members.map((member) => {
                  const memberId = member.userId ?? member.id
                  const isSelected = getConfigArray('targetUserIds').includes(memberId)
                  return (
                    <div key={memberId} className="flex items-center gap-2">
                      <Checkbox
                        id={`notify-member-${memberId}`}
                        checked={isSelected}
                        onCheckedChange={() => {
                          handleMemberToggle(memberId)
                          form.clearErrors('actionConfig')
                        }}
                      />
                      <Label
                        htmlFor={`notify-member-${memberId}`}
                        className="cursor-pointer font-normal"
                      >
                        {member.user?.fullName ?? member.email}
                      </Label>
                    </div>
                  )
                })}
              </div>
              {showConfigErrors && getConfigArray('targetUserIds').length === 0 && (
                <p className="text-sm text-destructive">Selecione ao menos um membro</p>
              )}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label>Canais de notificação *</Label>
            <p className="text-xs text-muted-foreground">
              WhatsApp envia para o telefone pessoal do membro (cadastrado no perfil) usando o primeiro inbox WhatsApp ativo da organização.
            </p>
            {(() => {
              const channels = getConfigArray('channels')
              const effective = channels.length > 0 ? channels : ['in_app']
              const toggleChannel = (value: 'in_app' | 'whatsapp') => {
                const current = channels.length > 0 ? channels : ['in_app']
                const next = current.includes(value)
                  ? current.filter((channel) => channel !== value)
                  : [...current, value]
                setActionConfigValue('channels', next)
                form.clearErrors('actionConfig')
              }
              return (
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="channel-in-app"
                      checked={effective.includes('in_app')}
                      onCheckedChange={() => toggleChannel('in_app')}
                    />
                    <Label htmlFor="channel-in-app" className="cursor-pointer font-normal">
                      Plataforma (in-app)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="channel-whatsapp"
                      checked={effective.includes('whatsapp')}
                      onCheckedChange={() => toggleChannel('whatsapp')}
                    />
                    <Label htmlFor="channel-whatsapp" className="cursor-pointer font-normal">
                      WhatsApp
                    </Label>
                  </div>
                </div>
              )
            })()}
            {showConfigErrors && getConfigArray('channels').length === 0 && (
              <p className="text-sm text-destructive">Selecione ao menos um canal</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <FormLabel>Mensagem *</FormLabel>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Inserir variável:</span>
              {MESSAGE_VARIABLES.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertVariable(variable.token)}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer font-mono text-xs hover:bg-accent transition-colors"
                  >
                    {variable.token}
                  </Badge>
                </button>
              ))}
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Ex: A negociação {{deal.title}} está parada no estágio {{deal.stage}} há mais de 2 dias."
              className={`resize-none ${showConfigErrors && !getConfigString('messageTemplate') ? 'border-destructive' : ''}`}
              rows={3}
              maxLength={500}
              value={getConfigString('messageTemplate')}
              onChange={(event) => {
                setActionConfigValue('messageTemplate', event.target.value)
                form.clearErrors('actionConfig')
              }}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-destructive">
                {showConfigErrors && !getConfigString('messageTemplate') ? 'Digite a mensagem' : ''}
              </span>
              <span
                className={cn(
                  'text-xs tabular-nums',
                  getConfigString('messageTemplate').length > 500
                    ? 'text-destructive'
                    : getConfigString('messageTemplate').length > 450
                      ? 'text-amber-600'
                      : 'text-muted-foreground',
                )}
              >
                {getConfigString('messageTemplate').length}/500
              </span>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE_DEAL_PRIORITY */}
      {actionType === AutomationAction.UPDATE_DEAL_PRIORITY && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={showConfigErrors && !getConfigString('targetPriority') ? 'true' : undefined}
        >
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Configuração (Alterar prioridade)
          </p>
          <div className="space-y-2">
            <Label>Nova prioridade *</Label>
            <Select
              value={getConfigString('targetPriority')}
              onValueChange={(val) => {
                setActionConfigValue('targetPriority', val)
                form.clearErrors('actionConfig')
              }}
            >
              <SelectTrigger className={showConfigErrors && !getConfigString('targetPriority') ? 'border-destructive' : ''}>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showConfigErrors && !getConfigString('targetPriority') && (
              <p className="text-sm text-destructive">Selecione a prioridade</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
