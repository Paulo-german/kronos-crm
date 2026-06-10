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
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import {
  ACTION_LABELS,
  REASSIGN_STRATEGY_LABELS,
  NOTIFY_TARGET_LABELS,
  PRIORITY_OPTIONS,
  LIFECYCLE_STAGE_OPTIONS,
  TASK_ACTION_TYPE_OPTIONS,
  TASK_ASSIGN_OPTIONS,
  DEAL_ASSIGN_OPTIONS,
  CONTACT_TRIGGER_SET,
} from './automation-labels'
import { CONTACT_SUPPORTED_ACTION_VALUES } from '@/_lib/automations/contact-compatibility'
import { Badge } from '@/_components/ui/badge'
import { cn } from '@/_lib/utils'
import {
  UserPlus,
  ArrowRight,
  XCircle,
  Bell,
  AlertTriangle,
  MessageCircle,
  UserCheck,
  Braces,
  ListChecks,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import type { AutomationTrigger } from '@prisma/client'
import type { AutomationFormValues } from './wizard-form-types'
import type { PipelineStageOption } from '@/_data-access/pipeline/get-pipeline-stages'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'
import type { DealLostReasonDto } from '@/_data-access/settings/get-lost-reasons'
import type { WhatsappInboxOption } from '@/_data-access/inbox/get-whatsapp-inboxes-for-automation'
import type { MetaTemplate } from '@/_lib/meta/types'
import { SENTINEL_DEAL_INBOX } from '@/_actions/automation/create-automation/schema'
import { Separator } from '@/_components/ui/separator'
import { Checkbox } from '@/_components/ui/checkbox'
import { SelectSeparator } from '@/_components/ui/select'
import {
  extractVariableIndices,
  renderWithVariables,
} from '@/_lib/meta/template-variables'

const ACTION_ICONS: Record<AutomationAction, React.ElementType> = {
  REASSIGN_DEAL: UserPlus,
  MOVE_DEAL_TO_STAGE: ArrowRight,
  MARK_DEAL_LOST: XCircle,
  NOTIFY_USER: Bell,
  UPDATE_DEAL_PRIORITY: AlertTriangle,
  SEND_WHATSAPP_FOLLOWUP: MessageCircle,
  UPDATE_CONTACT_LIFECYCLE: UserCheck,
  CREATE_TASK: ListChecks,
}

const DEAL_MESSAGE_VARIABLES = [
  { token: '{{deal.title}}', label: 'Título', group: 'Negócio' },
  { token: '{{deal.stage}}', label: 'Estágio', group: 'Negócio' },
  { token: '{{deal.assignee}}', label: 'Responsável', group: 'Negócio' },
  { token: '{{deal.value}}', label: 'Valor', group: 'Negócio' },
  { token: '{{contact.name}}', label: 'Nome', group: 'Contato' },
  { token: '{{contact.firstName}}', label: 'Primeiro nome', group: 'Contato' },
  { token: '{{user.name}}', label: 'Meu nome', group: 'Você' },
] as const

const CONTACT_MESSAGE_VARIABLES = [
  { token: '{{contact.name}}', label: 'Nome completo', group: 'Contato' },
  { token: '{{contact.firstName}}', label: 'Primeiro nome', group: 'Contato' },
  { token: '{{user.name}}', label: 'Meu nome', group: 'Você' },
] as const

// Ações disponíveis para triggers de contato — fonte única em contact-compatibility.ts
const CONTACT_AVAILABLE_ACTIONS = new Set<AutomationAction>(
  CONTACT_SUPPORTED_ACTION_VALUES,
)

interface VariableInserterProps {
  onInsert: (token: string) => void
  isContactKind?: boolean
}

const VariableInserter = ({
  onInsert,
  isContactKind = false,
}: VariableInserterProps) => {
  const variables = isContactKind
    ? CONTACT_MESSAGE_VARIABLES
    : DEAL_MESSAGE_VARIABLES
  const groups = [...new Set(variables.map((variable) => variable.group))]

  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">Inserir variável:</span>
      <div className="flex flex-col gap-1">
        {groups.map((group) => {
          const vars = variables.filter((variable) => variable.group === group)
          return (
            <div key={group} className="flex flex-wrap items-center gap-1">
              <span className="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/50">
                {group}
              </span>
              {vars.map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => onInsert(variable.token)}
                  className="inline-flex items-center gap-1 rounded border border-primary/25 bg-primary/5 px-1.5 py-0.5 text-[11px] font-medium text-primary/75 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
                >
                  <Braces className="h-2.5 w-2.5 shrink-0" />
                  {variable.label}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface WizardStepActionProps {
  stageOptions: PipelineStageOption[]
  members: AcceptedMemberDto[]
  lossReasons: DealLostReasonDto[]
  whatsappInboxes: WhatsappInboxOption[]
  showConfigErrors?: boolean
}

// ---------------------------------------------------------------------------
// Helpers de preview de template Meta
// ---------------------------------------------------------------------------

interface MetaTemplatePreviewProps {
  template: MetaTemplate
  bodyValues: string[]
  headerValues: string[]
}

function MetaTemplatePreview({
  template,
  bodyValues,
  headerValues,
}: MetaTemplatePreviewProps) {
  const bodyComp = template.components.find(
    (component) => component.type === 'BODY',
  )
  const headerComp = template.components.find(
    (component) => component.type === 'HEADER' && component.format === 'TEXT',
  )
  const footerComp = template.components.find(
    (component) => component.type === 'FOOTER',
  )

  const previewBody = bodyComp?.text
    ? renderWithVariables(bodyComp.text, bodyValues)
    : ''
  const previewHeader = headerComp?.text
    ? renderWithVariables(headerComp.text, headerValues)
    : ''
  const footerText = footerComp?.text ?? ''

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'linear-gradient(135deg, #e5ddd5 0%, #dcd5cc 100%)',
      }}
    >
      <div className="ml-auto max-w-[90%]">
        <div
          className="relative rounded-2xl rounded-tr-sm px-3 pb-2 pt-2.5 shadow-sm"
          style={{ backgroundColor: '#dcf8c6' }}
        >
          {previewHeader && (
            <p className="mb-1.5 text-sm font-bold text-gray-800">
              {previewHeader}
            </p>
          )}
          {previewBody && (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
              {previewBody}
            </p>
          )}
          {footerText && (
            <p className="mt-1.5 text-xs text-gray-500">{footerText}</p>
          )}
          <div className="mt-1 flex justify-end">
            <span className="text-[10px] text-gray-500">preview</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function WizardStepAction({
  stageOptions,
  members,
  lossReasons,
  whatsappInboxes,
  showConfigErrors = false,
}: WizardStepActionProps) {
  const form = useFormContext<AutomationFormValues>()
  const actionType = form.watch('actionType')
  const actionConfig = form.watch('actionConfig') as Record<string, unknown>
  const triggerType = form.watch('triggerType') as AutomationTrigger | undefined

  const isContactKind = triggerType
    ? CONTACT_TRIGGER_SET.has(triggerType)
    : false
  const availableActions = isContactKind
    ? Object.values(AutomationAction).filter((action) =>
        CONTACT_AVAILABLE_ACTIONS.has(action),
      )
    : Object.values(AutomationAction)

  // Estado de templates Meta para o select de follow-up
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  const handleActionChange = (value: AutomationAction) => {
    form.setValue('actionType', value)
    form.setValue('actionConfig', {})
    form.clearErrors('actionConfig')
    setMetaTemplates([])
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

  const getConfigNumber = (key: string, defaultValue: number): number => {
    const val = actionConfig[key]
    return typeof val === 'number' && Number.isFinite(val) ? val : defaultValue
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const followupTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Detecta se inbox selecionado é Meta Cloud
  const selectedInboxId = getConfigString('inboxId')
  const selectedInbox = whatsappInboxes.find(
    (inbox) => inbox.id === selectedInboxId,
  )
  const isMetaInbox = selectedInbox?.connectionType === 'META_CLOUD'

  // Carrega templates quando um inbox Meta é selecionado
  const loadMetaTemplates = useCallback(async (inboxId: string) => {
    setIsLoadingTemplates(true)
    try {
      const response = await fetch(`/api/inbox/templates?inboxId=${inboxId}`)
      if (!response.ok) throw new Error('Falha ao carregar templates')
      const data = (await response.json()) as { templates: MetaTemplate[] }
      // A rota já filtra APPROVED server-side — usa direto
      setMetaTemplates(data.templates)
    } catch {
      toast.error('Erro ao carregar templates Meta. Tente novamente.')
    } finally {
      setIsLoadingTemplates(false)
    }
  }, [])

  // Sincronização com API externa (Meta Graph API) ao selecionar inbox Meta
  useEffect(() => {
    if (
      isMetaInbox &&
      selectedInboxId &&
      selectedInboxId !== SENTINEL_DEAL_INBOX
    ) {
      loadMetaTemplates(selectedInboxId)
    } else {
      setMetaTemplates([])
    }
  }, [isMetaInbox, selectedInboxId, loadMetaTemplates])

  // Estado derivado: template selecionado a partir do actionConfig + templates carregados
  const metaTemplateName = getConfigString('metaTemplateName')
  const metaTemplateLanguage = getConfigString('metaTemplateLanguage')
  const selectedMetaTemplate =
    metaTemplateName && metaTemplateLanguage
      ? (metaTemplates.find(
          (template) =>
            template.name === metaTemplateName &&
            template.language === metaTemplateLanguage,
        ) ?? null)
      : null

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

  const insertFollowupVariable = (token: string) => {
    const textarea = followupTextareaRef.current
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
          Defina o que acontecerá quando o gatilho for ativado e as condições
          forem atendidas.
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
              onValueChange={(value) =>
                handleActionChange(value as AutomationAction)
              }
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a ação a ser executada" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {availableActions.map((action) => {
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
            showConfigErrors &&
            (!getConfigString('strategy') ||
              getConfigArray('targetUserIds').length === 0)
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              {Object.entries(REASSIGN_STRATEGY_LABELS).map(
                ([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem value={value} id={`strategy-${value}`} />
                    <Label
                      htmlFor={`strategy-${value}`}
                      className="cursor-pointer font-normal"
                    >
                      {label}
                    </Label>
                  </div>
                ),
              )}
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
                const isSelected =
                  getConfigArray('targetUserIds').includes(memberId)
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
            {showConfigErrors &&
              getConfigArray('targetUserIds').length === 0 && (
                <p className="text-sm text-destructive">
                  Selecione ao menos um membro
                </p>
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
            <Label
              htmlFor="excludeCurrentAssignee"
              className="cursor-pointer font-normal"
            >
              Não atribuir para o responsável atual
            </Label>
          </div>
        </div>
      )}

      {/* MOVE_DEAL_TO_STAGE */}
      {actionType === AutomationAction.MOVE_DEAL_TO_STAGE && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors && !getConfigString('targetStageId')
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              <SelectTrigger
                className={
                  showConfigErrors && !getConfigString('targetStageId')
                    ? 'border-destructive'
                    : ''
                }
              >
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
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Configuração (Marcar como perdida)
          </p>
          <div className="space-y-2">
            <Label>Motivo de perda (opcional)</Label>
            <Select
              value={getConfigString('lossReasonId')}
              onValueChange={(val) =>
                setActionConfigValue(
                  'lossReasonId',
                  val === 'none' ? undefined : val,
                )
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
              (getConfigString('targetType') === 'specific_users' &&
                getConfigArray('targetUserIds').length === 0))
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              {Object.entries(NOTIFY_TARGET_LABELS)
                .filter(
                  ([value]) => !(isContactKind && value === 'deal_assignee'),
                )
                .map(([value, label]) => (
                  <div key={value} className="flex items-center gap-2">
                    <RadioGroupItem value={value} id={`notify-${value}`} />
                    <Label
                      htmlFor={`notify-${value}`}
                      className="cursor-pointer font-normal"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
            </RadioGroup>
            {showConfigErrors && !getConfigString('targetType') && (
              <p className="text-sm text-destructive">
                Selecione quem notificar
              </p>
            )}
          </div>

          {getConfigString('targetType') === 'specific_users' && (
            <div className="space-y-2">
              <Label>Membros para notificar *</Label>
              <div className="grid grid-cols-1 gap-2">
                {members.map((member) => {
                  const memberId = member.userId ?? member.id
                  const isSelected =
                    getConfigArray('targetUserIds').includes(memberId)
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
              {showConfigErrors &&
                getConfigArray('targetUserIds').length === 0 && (
                  <p className="text-sm text-destructive">
                    Selecione ao menos um membro
                  </p>
                )}
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <Label>Canais de notificação *</Label>
            <p className="text-xs text-muted-foreground">
              WhatsApp envia para o telefone pessoal do membro (cadastrado no
              perfil) usando o primeiro inbox WhatsApp ativo da organização.
            </p>
            {(() => {
              // Normaliza em um único lugar: [] → ['in_app'] (padrão do schema)
              const rawChannels = getConfigArray('channels')
              const activeChannels =
                rawChannels.length > 0 ? rawChannels : ['in_app']

              const toggleChannel = (value: 'in_app' | 'whatsapp') => {
                const next = activeChannels.includes(value)
                  ? activeChannels.filter((channel) => channel !== value)
                  : [...activeChannels, value]
                setActionConfigValue('channels', next)
                form.clearErrors('actionConfig')
              }
              return (
                <div className="grid grid-cols-1 gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="channel-in-app"
                      checked={activeChannels.includes('in_app')}
                      onCheckedChange={() => toggleChannel('in_app')}
                    />
                    <Label
                      htmlFor="channel-in-app"
                      className="cursor-pointer font-normal"
                    >
                      Plataforma (in-app)
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="channel-whatsapp"
                      checked={activeChannels.includes('whatsapp')}
                      onCheckedChange={() => toggleChannel('whatsapp')}
                    />
                    <Label
                      htmlFor="channel-whatsapp"
                      className="cursor-pointer font-normal"
                    >
                      WhatsApp
                    </Label>
                  </div>
                </div>
              )
            })()}
            {showConfigErrors && getConfigArray('channels').length === 0 && (
              <p className="text-sm text-destructive">
                Selecione ao menos um canal
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Mensagem *</Label>
            <VariableInserter
              onInsert={insertVariable}
              isContactKind={isContactKind}
            />
            <Textarea
              ref={textareaRef}
              placeholder={
                isContactKind
                  ? 'Ex: Novo contato {{contact.name}} cadastrado. Dê as boas-vindas!'
                  : 'Ex: A negociação {{deal.title}} está parada no estágio {{deal.stage}} há mais de 2 dias.'
              }
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
                {showConfigErrors && !getConfigString('messageTemplate')
                  ? 'Digite a mensagem'
                  : ''}
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

      {/* SEND_WHATSAPP_FOLLOWUP */}
      {actionType === AutomationAction.SEND_WHATSAPP_FOLLOWUP && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={(() => {
            if (!showConfigErrors) return undefined
            const inboxId = getConfigString('inboxId')
            const isSentinel = inboxId === SENTINEL_DEAL_INBOX
            const missingBehavior =
              !isSentinel && !getConfigString('noConversationBehavior')
            const isMeta =
              whatsappInboxes.find((i) => i.id === inboxId)?.connectionType ===
              'META_CLOUD'
            if (isMeta) {
              return !inboxId ||
                !getConfigString('metaTemplateName') ||
                missingBehavior
                ? 'true'
                : undefined
            }
            return !inboxId ||
              !getConfigString('messageTemplate') ||
              missingBehavior
              ? 'true'
              : undefined
          })()}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Configuração (Follow-up no WhatsApp)
          </p>

          {/* Seletor de inbox */}
          {(() => {
            const isSentinel =
              getConfigString('inboxId') === SENTINEL_DEAL_INBOX
            return (
              <>
                <div className="space-y-2">
                  <Label>Inbox para envio *</Label>
                  <p className="text-xs text-muted-foreground">
                    {isContactKind
                      ? 'Inboxes selfhosted (Evolution JS/GO e Z-API) enviam texto livre. API Oficial (Meta) exige um template pré-aprovado. Inboxes internos da Kronos não estão disponíveis.'
                      : 'Inboxes Evolution e Z-API enviam texto livre. API Oficial (Meta) exige um template pré-aprovado.'}
                  </p>
                  <Select
                    value={getConfigString('inboxId')}
                    onValueChange={(val) => {
                      setActionConfigValue('inboxId', val)
                      // Limpa campos de template ao trocar de inbox
                      setActionConfigValue('metaTemplateName', undefined)
                      setActionConfigValue('metaTemplateLanguage', undefined)
                      setActionConfigValue('metaBodyParams', undefined)
                      setActionConfigValue('metaHeaderParams', undefined)
                      setActionConfigValue('messageTemplate', undefined)
                      form.clearErrors('actionConfig')
                    }}
                  >
                    <SelectTrigger
                      className={
                        showConfigErrors && !getConfigString('inboxId')
                          ? 'border-destructive'
                          : ''
                      }
                    >
                      <SelectValue placeholder="Selecione o inbox" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Opção sentinela: usa o inbox da conversa existente do contato */}
                      <SelectItem value={SENTINEL_DEAL_INBOX}>
                        <span className="flex flex-col">
                          <span>Caixa de entrada existente do contato</span>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            Usa o inbox onde o contato já tem conversa
                          </span>
                        </span>
                      </SelectItem>
                      {whatsappInboxes.length > 0 && <SelectSeparator />}
                      {whatsappInboxes.map((inbox) => {
                        const isKronosInternal =
                          inbox.connectionType === 'EVOLUTION'
                        const isInactive = !inbox.isActive
                        const isDisabled = isKronosInternal || isInactive
                        const isMeta = inbox.connectionType === 'META_CLOUD'
                        return (
                          <SelectItem
                            key={inbox.id}
                            value={inbox.id}
                            disabled={isDisabled}
                            className={isDisabled ? 'opacity-50' : ''}
                          >
                            <span className="flex items-center gap-2">
                              {inbox.name}
                              {isMeta && !isDisabled && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  API Oficial
                                </Badge>
                              )}
                              {isKronosInternal && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  Apenas selfhosted
                                </Badge>
                              )}
                              {isInactive && !isKronosInternal && (
                                <Badge
                                  variant="outline"
                                  className="px-1 py-0 text-[10px]"
                                >
                                  Inativo
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {showConfigErrors && !getConfigString('inboxId') && (
                    <p className="text-sm text-destructive">
                      Selecione o inbox para envio
                    </p>
                  )}
                </div>

                <Separator />

                {/* Comportamento sem conversa — irrelevante no modo sentinela */}
                {isSentinel ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Se o contato não tiver nenhuma conversa, a execução será
                      pulada automaticamente.
                    </p>
                    {isContactKind && (
                      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          Contatos recém-criados raramente têm conversa prévia.
                          Nesse modo, a automação será pulada na maioria dos
                          casos. Prefira selecionar um inbox fixo com
                          &quot;Criar conversa e enviar&quot;.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label>Se não houver conversa com o contato *</Label>
                    <RadioGroup
                      value={getConfigString('noConversationBehavior')}
                      onValueChange={(val) => {
                        setActionConfigValue('noConversationBehavior', val)
                        form.clearErrors('actionConfig')
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <RadioGroupItem
                          value="create"
                          id="ncb-create"
                          className="mt-0.5"
                        />
                        <div>
                          <Label
                            htmlFor="ncb-create"
                            className="cursor-pointer font-normal"
                          >
                            Criar conversa e enviar
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Uma nova conversa é aberta no inbox automaticamente.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <RadioGroupItem
                          value="skip"
                          id="ncb-skip"
                          className="mt-0.5"
                        />
                        <div>
                          <Label
                            htmlFor="ncb-skip"
                            className="cursor-pointer font-normal"
                          >
                            Pular execução
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            A automação é registrada como ignorada (sem erro).
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                    {showConfigErrors &&
                      !getConfigString('noConversationBehavior') && (
                        <p className="text-sm text-destructive">
                          Defina o comportamento sem conversa
                        </p>
                      )}
                  </div>
                )}
              </>
            )
          })()}

          <Separator />

          {/* Conteúdo da mensagem: Meta = seletor de template / selfhosted = textarea */}
          {isMetaInbox && selectedInboxId !== SENTINEL_DEAL_INBOX ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Template *</Label>
                <p className="text-xs text-muted-foreground">
                  Selecione um template aprovado pelo Meta. Apenas templates com
                  status APPROVED podem ser enviados.
                </p>
                {isLoadingTemplates ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando templates...
                  </div>
                ) : metaTemplates.length === 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                    Nenhum template aprovado encontrado para este inbox. Crie e
                    aprove templates nas configurações do inbox.
                  </div>
                ) : (
                  <Select
                    value={
                      getConfigString('metaTemplateName')
                        ? `${getConfigString('metaTemplateName')}::${getConfigString('metaTemplateLanguage')}`
                        : ''
                    }
                    onValueChange={(val) => {
                      const [name, language] = val.split('::')
                      const template = metaTemplates.find(
                        (template) =>
                          template.name === name &&
                          template.language === language,
                      )
                      setActionConfigValue('metaTemplateName', name)
                      setActionConfigValue('metaTemplateLanguage', language)
                      // Inicializa arrays de params com strings vazias para cada variável do template
                      if (template) {
                        const bodyComp = template.components.find(
                          (component) => component.type === 'BODY',
                        )
                        const headerComp = template.components.find(
                          (component) =>
                            component.type === 'HEADER' &&
                            component.format === 'TEXT',
                        )
                        const bodyVars = bodyComp?.text
                          ? extractVariableIndices(bodyComp.text)
                          : []
                        const headerVars = headerComp?.text
                          ? extractVariableIndices(headerComp.text)
                          : []
                        const bodySize =
                          bodyVars.length > 0 ? Math.max(...bodyVars) : 0
                        const headerSize =
                          headerVars.length > 0 ? Math.max(...headerVars) : 0
                        setActionConfigValue(
                          'metaBodyParams',
                          new Array(bodySize).fill(''),
                        )
                        setActionConfigValue(
                          'metaHeaderParams',
                          new Array(headerSize).fill(''),
                        )
                      }
                      form.clearErrors('actionConfig')
                    }}
                  >
                    <SelectTrigger
                      className={
                        showConfigErrors && !getConfigString('metaTemplateName')
                          ? 'border-destructive'
                          : ''
                      }
                    >
                      <SelectValue placeholder="Selecione o template" />
                    </SelectTrigger>
                    <SelectContent>
                      {metaTemplates.map((template) => (
                        <SelectItem
                          key={`${template.name}::${template.language}`}
                          value={`${template.name}::${template.language}`}
                        >
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-3 w-3 shrink-0 text-kronos-green" />
                            <span className="font-mono text-sm">
                              {template.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="px-1 py-0 font-mono text-[10px]"
                            >
                              {template.language}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showConfigErrors && !getConfigString('metaTemplateName') && (
                  <p className="text-sm text-destructive">
                    Selecione o template
                  </p>
                )}
              </div>

              {/* Variáveis do template selecionado */}
              {selectedMetaTemplate &&
                (() => {
                  const bodyComp = selectedMetaTemplate.components.find(
                    (component) => component.type === 'BODY',
                  )
                  const headerComp = selectedMetaTemplate.components.find(
                    (component) =>
                      component.type === 'HEADER' &&
                      component.format === 'TEXT',
                  )
                  const bodyVarIndices = bodyComp?.text
                    ? extractVariableIndices(bodyComp.text)
                    : []
                  const headerVarIndices = headerComp?.text
                    ? extractVariableIndices(headerComp.text)
                    : []
                  const hasVars =
                    bodyVarIndices.length > 0 || headerVarIndices.length > 0

                  if (!hasVars) return null

                  const bodyParams = getConfigArray('metaBodyParams')
                  const headerParams = getConfigArray('metaHeaderParams')

                  const updateBodyParam = (varIndex: number, token: string) => {
                    const updated = [...bodyParams]
                    updated[varIndex - 1] =
                      (updated[varIndex - 1] ?? '') + token
                    setActionConfigValue('metaBodyParams', updated)
                  }

                  const updateHeaderParam = (
                    varIndex: number,
                    token: string,
                  ) => {
                    const updated = [...headerParams]
                    updated[varIndex - 1] =
                      (updated[varIndex - 1] ?? '') + token
                    setActionConfigValue('metaHeaderParams', updated)
                  }

                  return (
                    <div className="space-y-4">
                      <Separator />
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Variáveis do template
                      </p>

                      {headerVarIndices.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Cabeçalho
                          </p>
                          {headerVarIndices.map((varIndex) => (
                            <div
                              key={`header-${varIndex}`}
                              className="space-y-1.5"
                            >
                              <Label className="font-mono text-xs">{`{{${varIndex}}}`}</Label>
                              <VariableInserter
                                onInsert={(token) =>
                                  updateHeaderParam(varIndex, token)
                                }
                                isContactKind={isContactKind}
                              />
                              <Input
                                value={headerParams[varIndex - 1] ?? ''}
                                onChange={(event) => {
                                  const updated = [...headerParams]
                                  updated[varIndex - 1] = event.target.value
                                  setActionConfigValue(
                                    'metaHeaderParams',
                                    updated,
                                  )
                                  form.clearErrors('actionConfig')
                                }}
                                placeholder={`Valor para {{${varIndex}}} — use os chips acima ou digite texto`}
                                className="h-9 font-mono text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {bodyVarIndices.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Corpo
                          </p>
                          {bodyVarIndices.map((varIndex) => (
                            <div
                              key={`body-${varIndex}`}
                              className="space-y-1.5"
                            >
                              <Label className="font-mono text-xs">{`{{${varIndex}}}`}</Label>
                              <VariableInserter
                                onInsert={(token) =>
                                  updateBodyParam(varIndex, token)
                                }
                                isContactKind={isContactKind}
                              />
                              <Input
                                value={bodyParams[varIndex - 1] ?? ''}
                                onChange={(event) => {
                                  const updated = [...bodyParams]
                                  updated[varIndex - 1] = event.target.value
                                  setActionConfigValue(
                                    'metaBodyParams',
                                    updated,
                                  )
                                  form.clearErrors('actionConfig')
                                }}
                                placeholder={`Valor para {{${varIndex}}} — use os chips acima ou digite texto`}
                                className="h-9 font-mono text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Preview em tempo real */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Preview
                        </p>
                        <MetaTemplatePreview
                          template={selectedMetaTemplate}
                          bodyValues={bodyParams}
                          headerValues={headerParams}
                        />
                      </div>
                    </div>
                  )
                })()}
            </div>
          ) : (
            /* Modo selfhosted: textarea de texto livre */
            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <VariableInserter
                onInsert={insertFollowupVariable}
                isContactKind={isContactKind}
              />
              <Textarea
                ref={followupTextareaRef}
                placeholder={
                  isContactKind
                    ? 'Ex: Olá {{contact.firstName}}, seja bem-vindo! Como posso ajudar?'
                    : 'Ex: Olá {{contact.firstName}}, tudo bem? Queria retomar a conversa sobre {{deal.title}}.'
                }
                className={`resize-none ${showConfigErrors && !getConfigString('messageTemplate') && !isMetaInbox ? 'border-destructive' : ''}`}
                rows={4}
                maxLength={1000}
                value={getConfigString('messageTemplate')}
                onChange={(event) => {
                  setActionConfigValue('messageTemplate', event.target.value)
                  form.clearErrors('actionConfig')
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-destructive">
                  {showConfigErrors &&
                  !getConfigString('messageTemplate') &&
                  !isMetaInbox
                    ? 'Digite a mensagem'
                    : ''}
                </span>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    getConfigString('messageTemplate').length > 1000
                      ? 'text-destructive'
                      : getConfigString('messageTemplate').length > 900
                        ? 'text-amber-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {getConfigString('messageTemplate').length}/1000
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* UPDATE_DEAL_PRIORITY */}
      {actionType === AutomationAction.UPDATE_DEAL_PRIORITY && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors && !getConfigString('targetPriority')
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
              <SelectTrigger
                className={
                  showConfigErrors && !getConfigString('targetPriority')
                    ? 'border-destructive'
                    : ''
                }
              >
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

      {/* UPDATE_CONTACT_LIFECYCLE */}
      {actionType === AutomationAction.UPDATE_CONTACT_LIFECYCLE && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors &&
            (!getConfigString('targetStage') ||
              (isContactKind &&
                getConfigBoolean('createDeal') &&
                (!getConfigString('dealStageId') ||
                  (getConfigString('dealAssignTo') === 'specific_user' &&
                    !getConfigString('dealAssignToUserId')))))
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Configuração (Avançar ciclo do contato)
          </p>
          <div className="space-y-2">
            <Label>Avançar para o estágio *</Label>
            <Select
              value={getConfigString('targetStage')}
              onValueChange={(val) => {
                setActionConfigValue('targetStage', val)
                form.clearErrors('actionConfig')
              }}
            >
              <SelectTrigger
                className={
                  showConfigErrors && !getConfigString('targetStage')
                    ? 'border-destructive'
                    : ''
                }
              >
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                {LIFECYCLE_STAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              O avanço é monotônico — contatos já no estágio selecionado ou
              acima não regridem.
            </p>
            {showConfigErrors && !getConfigString('targetStage') && (
              <p className="text-sm text-destructive">Selecione o estágio</p>
            )}
          </div>

          {isContactKind && (
            <>
              <Separator />

              {/* Toggle createDeal */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lifecycle-create-deal"
                  checked={getConfigBoolean('createDeal')}
                  onCheckedChange={(checked) => {
                    setActionConfigValue('createDeal', checked === true)
                    form.clearErrors('actionConfig')
                  }}
                />
                <Label
                  htmlFor="lifecycle-create-deal"
                  className="cursor-pointer font-normal"
                >
                  Também criar uma negociação vinculada ao contato
                </Label>
              </div>

              {getConfigBoolean('createDeal') && (
                <div className="space-y-4 rounded-md border bg-background p-3">
                  {/* Pipeline + Estágio — o pipelineId é derivado do stage escolhido */}
                  <div className="space-y-2">
                    <Label>Pipeline e estágio *</Label>
                    <Select
                      value={getConfigString('dealStageId')}
                      onValueChange={(val) => {
                        const selectedStage = stageOptions.find(
                          (stage) => stage.stageId === val,
                        )
                        setActionConfigValue('dealStageId', val)
                        setActionConfigValue(
                          'dealPipelineId',
                          selectedStage?.pipelineId,
                        )
                        form.clearErrors('actionConfig')
                      }}
                    >
                      <SelectTrigger
                        className={
                          showConfigErrors && !getConfigString('dealStageId')
                            ? 'border-destructive'
                            : ''
                        }
                      >
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
                    {showConfigErrors && !getConfigString('dealStageId') && (
                      <p className="text-sm text-destructive">
                        Selecione o estágio
                      </p>
                    )}
                  </div>

                  {/* Título da negociação (template) */}
                  <div className="space-y-2">
                    <Label>Título da negociação</Label>
                    <VariableInserter
                      onInsert={(token) =>
                        setActionConfigValue(
                          'dealTitleTemplate',
                          getConfigString('dealTitleTemplate') + token,
                        )
                      }
                      isContactKind
                    />
                    <Input
                      placeholder="{{contact.name}}"
                      maxLength={200}
                      value={getConfigString('dealTitleTemplate')}
                      onChange={(event) => {
                        setActionConfigValue(
                          'dealTitleTemplate',
                          event.target.value,
                        )
                        form.clearErrors('actionConfig')
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Vazio = usa o nome do contato.
                    </p>
                  </div>

                  {/* Valor + Prioridade */}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Valor inicial</Label>
                      <Input
                        type="number"
                        min={0}
                        value={getConfigNumber('dealDefaultValue', 0)}
                        onChange={(event) =>
                          setActionConfigValue(
                            'dealDefaultValue',
                            event.target.value === ''
                              ? 0
                              : Number(event.target.value),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={getConfigString('dealPriority') || 'medium'}
                        onValueChange={(val) =>
                          setActionConfigValue('dealPriority', val)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Responsável: contact_assignee | specific_user */}
                  <div className="space-y-3">
                    <Label>Responsável pela negociação *</Label>
                    <RadioGroup
                      value={
                        getConfigString('dealAssignTo') || 'contact_assignee'
                      }
                      onValueChange={(val) => {
                        setActionConfigValue('dealAssignTo', val)
                        if (val === 'contact_assignee') {
                          setActionConfigValue('dealAssignToUserId', undefined)
                        }
                        form.clearErrors('actionConfig')
                      }}
                      className="space-y-2"
                    >
                      {DEAL_ASSIGN_OPTIONS.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center gap-2"
                        >
                          <RadioGroupItem
                            value={option.value}
                            id={`deal-assign-${option.value}`}
                          />
                          <Label
                            htmlFor={`deal-assign-${option.value}`}
                            className="cursor-pointer font-normal"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {/* Aviso: contact_assignee exige contato com responsável */}
                    {(getConfigString('dealAssignTo') || 'contact_assignee') ===
                      'contact_assignee' && (
                      <p className="text-xs text-muted-foreground">
                        Se o contato não tiver responsável, a negociação não
                        será criada (a etapa do ciclo ainda avança).
                      </p>
                    )}
                  </div>

                  {getConfigString('dealAssignTo') === 'specific_user' && (
                    <div className="space-y-2">
                      <Label>Membro responsável *</Label>
                      <Select
                        value={getConfigString('dealAssignToUserId')}
                        onValueChange={(val) => {
                          setActionConfigValue('dealAssignToUserId', val)
                          form.clearErrors('actionConfig')
                        }}
                      >
                        <SelectTrigger
                          className={
                            showConfigErrors &&
                            !getConfigString('dealAssignToUserId')
                              ? 'border-destructive'
                              : ''
                          }
                        >
                          <SelectValue placeholder="Selecione o membro" />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => {
                            const memberId = member.userId ?? member.id
                            return (
                              <SelectItem key={memberId} value={memberId}>
                                {member.user?.fullName ?? member.email}
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      {showConfigErrors &&
                        !getConfigString('dealAssignToUserId') && (
                          <p className="text-sm text-destructive">
                            Selecione o membro
                          </p>
                        )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CREATE_TASK */}
      {actionType === AutomationAction.CREATE_TASK && (
        <div
          className="space-y-4 rounded-md border bg-muted/30 p-4"
          data-error={
            showConfigErrors &&
            (!getConfigString('titleTemplate') ||
              !getConfigString('assignTo') ||
              (getConfigString('assignTo') === 'specific_user' &&
                !getConfigString('assignToUserId')))
              ? 'true'
              : undefined
          }
        >
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Configuração (Criar tarefa)
          </p>

          <div className="space-y-2">
            <Label>Título da tarefa *</Label>
            <VariableInserter
              onInsert={(token) => {
                const current = getConfigString('titleTemplate')
                setActionConfigValue('titleTemplate', current + token)
                form.clearErrors('actionConfig')
              }}
            />
            <Input
              placeholder="Ex: Follow-up com {{contact.firstName}} sobre {{deal.title}}"
              maxLength={200}
              className={
                showConfigErrors && !getConfigString('titleTemplate')
                  ? 'border-destructive'
                  : ''
              }
              value={getConfigString('titleTemplate')}
              onChange={(event) => {
                setActionConfigValue('titleTemplate', event.target.value)
                form.clearErrors('actionConfig')
              }}
            />
            {showConfigErrors && !getConfigString('titleTemplate') && (
              <p className="text-sm text-destructive">Digite o título</p>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select
              value={getConfigString('taskType') || 'TASK'}
              onValueChange={(val) => setActionConfigValue('taskType', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {TASK_ACTION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vencimento (dias a partir de hoje)</Label>
            <Input
              type="number"
              min={0}
              max={365}
              value={getConfigNumber('dueInDays', 1)}
              onChange={(event) =>
                setActionConfigValue(
                  'dueInDays',
                  event.target.value === '' ? 1 : Number(event.target.value),
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              0 = vence hoje às 23:59. Máximo 365 dias.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select
              value={getConfigString('priority') || 'medium'}
              onValueChange={(val) => setActionConfigValue('priority', val)}
            >
              <SelectTrigger>
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
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Atribuir tarefa para *</Label>
            <RadioGroup
              value={getConfigString('assignTo')}
              onValueChange={(val) => {
                setActionConfigValue('assignTo', val)
                if (val === 'deal_assignee') {
                  setActionConfigValue('assignToUserId', undefined)
                }
                form.clearErrors('actionConfig')
              }}
              className="space-y-2"
            >
              {TASK_ASSIGN_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`task-assign-${option.value}`}
                  />
                  <Label
                    htmlFor={`task-assign-${option.value}`}
                    className="cursor-pointer font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {showConfigErrors && !getConfigString('assignTo') && (
              <p className="text-sm text-destructive">
                Selecione como atribuir
              </p>
            )}
          </div>

          {getConfigString('assignTo') === 'specific_user' && (
            <div className="space-y-2">
              <Label>Membro responsável *</Label>
              <Select
                value={getConfigString('assignToUserId')}
                onValueChange={(val) => {
                  setActionConfigValue('assignToUserId', val)
                  form.clearErrors('actionConfig')
                }}
              >
                <SelectTrigger
                  className={
                    showConfigErrors && !getConfigString('assignToUserId')
                      ? 'border-destructive'
                      : ''
                  }
                >
                  <SelectValue placeholder="Selecione o membro" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => {
                    const memberId = member.userId ?? member.id
                    return (
                      <SelectItem key={memberId} value={memberId}>
                        {member.user?.fullName ?? member.email}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {showConfigErrors && !getConfigString('assignToUserId') && (
                <p className="text-sm text-destructive">Selecione o membro</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
